// src/services/ztmService.ts

import type { ZtmPermit, ZtmAgentStatus, ZtmAgentConfig } from '../types';
import * as nodeForge from 'node-forge';

const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[ZtmService] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ZtmService] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[ZtmService] ${msg}`, ...args),
};

class ZtmService {
  private localAgentUrl: string;
  private meshName: string;

  constructor(
    localAgentUrl?: string,
    meshName?: string
  ) {
    this.localAgentUrl = localAgentUrl || import.meta.env.VITE_ZTM_LOCAL_AGENT_URL || 'http://localhost:7778/';
    this.meshName = meshName || import.meta.env.VITE_ZTM_MESH_NAME || 'ztm-hub:8888';
  }

  // Validate ZTM local agent connection
  async validateLocalAgentConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.localAgentUrl}api/status`);
      if (!response.ok) {
        throw new Error(`ZTM local agent connection failed: ${response.status}`);
      }
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Error validating ZTM local agent connection:', error);
      return false;
    }
  }

  // Get ZTM agent status
  async getAgentStatus(agentUrl: string): Promise<ZtmAgentStatus> {
    try {
      const response = await fetch(`${agentUrl}api/status`);
      if (!response.ok) {
        throw new Error(`Failed to get agent status: ${response.status}`);
      }
      const data = await response.json();
      return {
        connected: data.status === 'ok',
        meshName: data.mesh || this.meshName,
        agentId: data.agentId || 'unknown',
        version: data.version || 'unknown',
        uptime: data.uptime || 0,
        connections: data.connections || 0,
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      throw new Error(`Failed to get agent status: ${(error as Error).message}`);
    }
  }

  // Get ZTM local agent status
  async getLocalAgentStatus(): Promise<ZtmAgentStatus> {
    return this.getAgentStatus(this.localAgentUrl);
  }

  // Configure local ZTM agent
  async configureLocalAgent(config: ZtmAgentConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.localAgentUrl}api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`Failed to configure local agent: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error configuring local agent:', error);
      return false;
    }
  }

  // Join mesh
  async joinMesh(username: string, certificate: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.localAgentUrl}api/meshes/${this.meshName}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          certificate,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to join mesh: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error joining mesh:', error);
      return false;
    }
  }

  // Leave mesh
  async leaveMesh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.localAgentUrl}api/meshes/${this.meshName}/leave`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to leave mesh: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error leaving mesh:', error);
      return false;
    }
  }

  // Get connected nodes
  async getConnectedNodes(): Promise<any[]> {
    try {
      const response = await fetch(`${this.localAgentUrl}api/meshes/${this.meshName}/nodes`);
      if (!response.ok) {
        throw new Error(`Failed to get connected nodes: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting connected nodes:', error);
      return [];
    }
  }

  // Get identity from local ZTM agent
  async getIdentityFromLocalAgent(): Promise<string> {
    try {
      console.log('Getting identity from local ZTM agent');
      
      const response = await fetch(`${this.localAgentUrl}api/identity`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get identity from local agent: ${response.status} ${errorText}`);
      }
      
      const identity = await response.text();
      console.log('Identity retrieved successfully from local agent');
      
      return identity;
    } catch (error: any) {
      console.error('Get identity from local agent error:', error);
      throw new Error(`Failed to get identity from local agent: ${error.message}`);
    }
  }

  // Validate identity file
  validateIdentityFile(identity: string): boolean {
    // Check if identity is a valid PEM format public key
    return identity.includes('-----BEGIN PUBLIC KEY-----') && 
           identity.includes('-----END PUBLIC KEY-----');
  }

  // Encrypt identity file for upload
  encryptIdentityFile(identity: string): { encryptedIdentity: string; encryptionNonce: string; identityChecksum: string } {
    // In a real implementation, this would encrypt the identity file
    // For now, we'll simulate it
    return {
      encryptedIdentity: `encrypted_${identity}`,
      encryptionNonce: `nonce_${Date.now()}`,
      identityChecksum: `checksum_${Date.now()}`,
    };
  }

  // Decrypt identity file
  decryptIdentityFile(encryptedIdentity: string, encryptionNonce: string): string {
    // In a real implementation, this would decrypt the identity file
    // For now, we'll simulate it
    return encryptedIdentity.replace('encrypted_', '');
  }

  // Import permit file to local ZTM agent
  async importPermit(permit: any): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Importing permit to local ZTM agent');
      
      // Check if this is a complete permit (CA + Agent + Bootstraps)
      if (permit.ca && permit.agent && permit.agent.certificate && permit.bootstraps) {
        console.log('Detected complete permit format (CA + Agent + Bootstraps), joining mesh');
        
        // According to ztm-agent-jion-mesh.har:
        // Use POST /api/meshes/mesh to join mesh with complete permit
        const response = await fetch(`${this.localAgentUrl}api/meshes/mesh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ca: permit.ca,
            agent: {
              certificate: permit.agent.certificate,
              name: permit.agent.name
            },
            bootstraps: permit.bootstraps
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to join mesh: ${response.status} ${errorText}`);
        }
        
        console.log('Mesh joined successfully');
        return {
          success: true,
          message: 'Mesh joined successfully',
        };
      }
      
      // Handle CA file format (only CA certificate)
      if (permit.ca && typeof permit.ca === 'string' && !permit.agent) {
        console.log('Detected CA file format, this is for CA certificate only');
        
        // CA file is used for trust configuration, not for joining mesh
        // This is typically used to configure the CA certificate for the agent
        const response = await fetch(`${this.localAgentUrl}api/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ca: permit.ca
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to configure CA certificate: ${response.status} ${errorText}`);
        }
        
        console.log('CA certificate configured successfully');
        return {
          success: true,
          message: 'CA certificate configured successfully',
        };
      }
      
      // Handle Agent permit format (without CA)
      if (permit.agent && permit.agent.certificate) {
        console.log('Detected Agent permit format (without CA), joining mesh');
        
        // Use POST /api/meshes/mesh to join mesh with agent certificate only
        const response = await fetch(`${this.localAgentUrl}api/meshes/mesh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ca: '',
            agent: {
              certificate: permit.agent.certificate,
              name: permit.agent.name
            },
            bootstraps: permit.bootstraps || []
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to join mesh: ${response.status} ${errorText}`);
        }
        
        console.log('Mesh joined successfully');
        return {
          success: true,
          message: 'Mesh joined successfully',
        };
      }
      
      throw new Error('Invalid permit format: must be complete permit (CA + Agent + Bootstraps), CA file, or Agent permit');
    } catch (error: any) {
      console.error('Import permit error:', error);
      throw new Error(`Failed to import permit: ${error.message}`);
    }
  }
}

export const ztmService = new ZtmService();
export default ztmService;