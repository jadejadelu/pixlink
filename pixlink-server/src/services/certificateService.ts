import * as forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import config from '../config';
import logger from '../utils/logger';

export class CertificateService {
  private caCert!: forge.pki.Certificate;
  private caKey!: forge.pki.PrivateKey;

  constructor() {
    this.loadCA();
  }

  private loadCA(): void {
    try {
      const certPath = path.resolve(config.ca.certPath);
      const keyPath = path.resolve(config.ca.keyPath);

      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        logger.warn('CA certificates not found, generating new ones');
        this.generateCA();
        return;
      }

      const certContent = fs.readFileSync(certPath, 'utf8');
      const keyContent = fs.readFileSync(keyPath, 'utf8');

      this.caCert = forge.pki.certificateFromPem(certContent);
      this.caKey = forge.pki.privateKeyFromPem(keyContent);

      logger.info('CA certificates loaded successfully');
    } catch (error) {
      logger.error('Failed to load CA certificates:', error);
      throw new Error('Failed to load CA certificates');
    }
  }

  private generateCA(): void {
    try {
      const keys = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();

      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

      const attrs = [{
        name: 'commonName',
        value: 'PixLink Root CA',
      }, {
        name: 'countryName',
        value: 'CN',
      }, {
        name: 'organizationName',
        value: 'PixLink',
      }];

      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.setExtensions([{
        name: 'basicConstraints',
        cA: true,
      }, {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      }]);

      cert.sign(keys.privateKey, forge.md.sha256.create());

      const certDir = path.dirname(config.ca.certPath);
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      fs.writeFileSync(config.ca.certPath, forge.pki.certificateToPem(cert));
      fs.writeFileSync(config.ca.keyPath, forge.pki.privateKeyToPem(keys.privateKey));

      this.caCert = cert;
      this.caKey = keys.privateKey;

      logger.info('CA certificates generated successfully');
    } catch (error) {
      logger.error('Failed to generate CA certificates:', error);
      throw new Error('Failed to generate CA certificates');
    }
  }

  async issueCertificate(
    userId: string,
    deviceId: string,
    ztmUsername: string,
    csrPem: string
  ): Promise<{
    certificateChain: string;
    fingerprint: string;
    notBefore: Date;
    notAfter: Date;
  }> {
    try {
      const csr = forge.pki.certificationRequestFromPem(csrPem);

      if (!csr.verify()) {
        throw new Error('Invalid CSR signature');
      }

      if (!csr.publicKey) {
        throw new Error('CSR public key is missing');
      }

      const cert = forge.pki.createCertificate();
      cert.publicKey = csr.publicKey;
      cert.serialNumber = this.generateSerialNumber();
      
      const now = new Date();
      cert.validity.notBefore = now;
      cert.validity.notAfter = new Date(now.getTime() + config.ca.validityDays * 24 * 60 * 60 * 1000);

      const subjectAttrs = csr.subject.attributes;
      cert.setSubject(subjectAttrs);
      cert.setIssuer(this.caCert.subject.attributes);

      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: false,
        },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 1,
              value: ztmUsername,
            },
          ],
        },
      ]);

      cert.sign(this.caKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create());

      const userCertPem = forge.pki.certificateToPem(cert);
      const caCertPem = forge.pki.certificateToPem(this.caCert);
      const certificateChain = userCertPem + caCertPem;

      const fingerprint = this.generateFingerprint(cert);

      const certificate = await prisma.certificate.create({
        data: {
          userId,
          deviceId,
          ztmUsername,
          status: 'ACTIVE',
          fingerprint,
          notBefore: cert.validity.notBefore,
          notAfter: cert.validity.notAfter,
          certificateChain,
        },
      });

      logger.info(`Certificate issued for user ${userId}, device ${deviceId}, ztmUsername ${ztmUsername}`);

      return {
        certificateChain,
        fingerprint,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
      };
    } catch (error) {
      logger.error('Failed to issue certificate:', error);
      throw new Error('Failed to issue certificate');
    }
  }

  async revokeCertificate(certificateId: string, userId: string): Promise<void> {
    try {
      const certificate = await prisma.certificate.findFirst({
        where: {
          id: certificateId,
          userId,
        },
      });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      await prisma.certificate.update({
        where: { id: certificateId },
        data: { status: 'REVOKED' },
      });

      logger.info(`Certificate revoked: ${certificateId}`);
    } catch (error) {
      logger.error('Failed to revoke certificate:', error);
      throw new Error('Failed to revoke certificate');
    }
  }

  async getCertificatesByUser(userId: string) {
    try {
      return await prisma.certificate.findMany({
        where: { userId },
        include: {
          device: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get certificates:', error);
      throw new Error('Failed to get certificates');
    }
  }

  private generateSerialNumber(): string {
    return Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
  }

  private generateFingerprint(cert: forge.pki.Certificate): string {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha1.create();
    md.update(der);
    return md.digest().toHex().toUpperCase();
  }

  async checkExpiredCertificates(): Promise<number> {
    try {
      const result = await prisma.certificate.updateMany({
        where: {
          status: 'ACTIVE',
          notAfter: {
            lt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      logger.info(`Marked ${result.count} certificates as expired`);
      return result.count;
    } catch (error) {
      logger.error('Failed to check expired certificates:', error);
      throw new Error('Failed to check expired certificates');
    }
  }
}

export default new CertificateService();