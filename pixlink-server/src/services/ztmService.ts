import config from '../config';
import logger from '../utils/logger';

class ZTMService {
  private rootAgentUrl: string;
  private meshName: string;

  constructor() {
    this.rootAgentUrl = config.ztm.rootAgentUrl;
    this.meshName = config.ztm.meshName;
  }

  async createUserPermit(username: string, publicKey: string): Promise<{
    certificate: string;
    privateKey: string;
    certificateId: string;
  }> {
    try {
      logger.info(`Creating ZTM permit for user: ${username}`);
      logger.info(`Public key (first 100 chars): ${publicKey.substring(0, 100)}`);

      const response = await fetch(`${this.rootAgentUrl}/api/meshes/${this.meshName}/permits/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: publicKey,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`ZTM API error: ${response.status} ${errorText}`);
        throw new Error(`Failed to create ZTM permit: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      logger.info(`ZTM permit created successfully for user: ${username}`);

      return {
        certificate: data.agent.certificate,
        privateKey: '',
        certificateId: `cert_${username}_${Date.now()}`,
      };
    } catch (error: any) {
      logger.error('Create user permit error:', error);
      throw new Error(`Failed to create ZTM permit: ${error.message}`);
    }
  }

  async getMeshInfo(): Promise<any> {
    try {
      logger.info('Getting ZTM mesh info');

      const response = await fetch(`${this.rootAgentUrl}/api/meshes`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`ZTM API error: ${response.status} ${errorText}`);
        throw new Error(`Failed to get mesh info: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      logger.info('ZTM mesh info retrieved successfully');

      // Find mesh with matching name
      const mesh = Array.isArray(data) ? data.find((m: any) => m.name === this.meshName) : data;
      
      if (!mesh) {
        logger.error(`Mesh not found: ${this.meshName}`);
        throw new Error(`Mesh not found: ${this.meshName}`);
      }

      logger.info(`Found mesh: ${mesh.name}, CA certificate: ${mesh.ca ? 'present' : 'missing'}`);

      return mesh;
    } catch (error: any) {
      logger.error('Get mesh info error:', error);
      throw new Error(`Failed to get mesh info: ${error.message}`);
    }
  }

  async validateAgentConnection(): Promise<boolean> {
    try {
      logger.info('Validating ZTM root agent connection');

      const response = await fetch(`${this.rootAgentUrl}/api/meshes`);
      
      if (response.ok) {
        logger.info('ZTM root agent connection validated successfully');
        return true;
      }

      logger.warn(`ZTM root agent connection failed: ${response.status}`);
      return false;
    } catch (error: any) {
      logger.error('Validate agent connection error:', error);
      return false;
    }
  }
}

export default new ZTMService();
