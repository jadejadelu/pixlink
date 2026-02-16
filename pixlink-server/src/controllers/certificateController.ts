import { Response } from 'express';
import certificateService from '../services/certificateService';
import deviceService from '../services/deviceService';
import { AuthRequest, CertificateIssueRequest, CertificateIssueResponse, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import enrollmentTokenService from '../services/enrollmentTokenService';

export class CertificateController {
  async issueCertificate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { csr, enrollmentToken }: CertificateIssueRequest = req.body;

      if (!csr || !enrollmentToken) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const verification = await enrollmentTokenService.verifyEnrollmentToken(
        enrollmentToken,
        req.deviceNonce || ''
      );

      if (!verification.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired enrollment token',
        });
        return;
      }

      if (verification.userId !== req.userId) {
        res.status(403).json({
          success: false,
          error: 'Enrollment token does not match user',
        });
        return;
      }

      const device = await deviceService.getDeviceByNonce(req.deviceNonce || '');
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found',
        });
        return;
      }

      const ztmUsername = `user_${req.userId.substring(0, 8)}_${device.id.substring(0, 8)}`;

      const result: CertificateIssueResponse = await certificateService.issueCertificate(
        req.userId,
        device.id,
        ztmUsername,
        csr
      );

      await enrollmentTokenService.markTokenAsUsed(enrollmentToken);

      const response: ApiResponse<CertificateIssueResponse> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Issue certificate error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to issue certificate',
      });
    }
  }

  async getCertificates(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const certificates = await certificateService.getCertificatesByUser(req.userId);

      const response: ApiResponse = {
        success: true,
        data: certificates,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Get certificates error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get certificates',
      });
    }
  }

  async revokeCertificate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { certificateId } = req.params;

      await certificateService.revokeCertificate(certificateId, req.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Certificate revoked successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Revoke certificate error:', error);
      const statusCode = error.message === 'Certificate not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to revoke certificate',
      });
    }
  }

  async getCertificateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { certificateId } = req.params;

      const certificate = await certificateService.getCertificatesByUser(req.userId);
      const cert = certificate.find((c: any) => c.id === certificateId);

      if (!cert) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: cert.id,
          status: cert.status,
          notBefore: cert.notBefore,
          notAfter: cert.notAfter,
          fingerprint: cert.fingerprint,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Get certificate status error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get certificate status',
      });
    }
  }
}

export default new CertificateController();