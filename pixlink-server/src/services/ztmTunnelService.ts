import config from '../config';
import logger from '../utils/logger';
import { TunnelType } from '@prisma/client';

class ZTMTunnelService {
  private rootAgentUrl: string;
  private meshName: string;

  constructor() {
    this.rootAgentUrl = config.ztm.rootAgentUrl;
    this.meshName = config.ztm.meshName;
  }

  /**
   * 创建 ZTM 隧道 (outbound - 主机端)
   */
  async createOutboundTunnel(
    tunnelName: string, 
    protocol: TunnelType, 
    targetHost: string, 
    targetPort: number
  ): Promise<boolean> {
    try {
      logger.info(`Creating outbound tunnel: ${tunnelName}, protocol: ${protocol}, target: ${targetHost}:${targetPort}`);

      const response = await fetch(`${this.rootAgentUrl}/api/meshes/${this.meshName}/tunnels/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${protocol.toLowerCase()}/${tunnelName}`,
          protocol: protocol.toLowerCase(),
          targets: [`${targetHost}:${targetPort}`]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to create outbound tunnel: ${response.status} ${errorText}`);
        throw new Error(`Failed to create outbound tunnel: ${response.status} ${errorText}`);
      }

      logger.info(`Outbound tunnel created successfully: ${tunnelName}`);
      return true;
    } catch (error: any) {
      logger.error('Create outbound tunnel error:', error);
      throw new Error(`Failed to create outbound tunnel: ${error.message}`);
    }
  }

  /**
   * 创建 ZTM 隧道 (inbound - 参与者端)
   */
  async createInboundTunnel(
    tunnelName: string, 
    protocol: TunnelType, 
    listenPort: number
  ): Promise<boolean> {
    try {
      logger.info(`Creating inbound tunnel: ${tunnelName}, protocol: ${protocol}, listen port: ${listenPort}`);

      const response = await fetch(`${this.rootAgentUrl}/api/meshes/${this.meshName}/tunnels/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${protocol.toLowerCase()}/${tunnelName}`,
          protocol: protocol.toLowerCase(),
          listen: listenPort
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to create inbound tunnel: ${response.status} ${errorText}`);
        throw new Error(`Failed to create inbound tunnel: ${response.status} ${errorText}`);
      }

      logger.info(`Inbound tunnel created successfully: ${tunnelName}`);
      return true;
    } catch (error: any) {
      logger.error('Create inbound tunnel error:', error);
      throw new Error(`Failed to create inbound tunnel: ${error.message}`);
    }
  }

  /**
   * 删除 ZTM 隧道
   */
  async deleteTunnel(tunnelName: string, protocol: TunnelType, direction: 'inbound' | 'outbound'): Promise<boolean> {
    try {
      logger.info(`Deleting ${direction} tunnel: ${tunnelName}, protocol: ${protocol}`);

      const response = await fetch(`${this.rootAgentUrl}/api/meshes/${this.meshName}/tunnels/${direction}/${protocol.toLowerCase()}/${tunnelName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to delete ${direction} tunnel: ${response.status} ${errorText}`);
        // 如果隧道不存在，也认为删除成功
        if (response.status === 404) {
          logger.info(`Tunnel not found, considered as deleted: ${tunnelName}`);
          return true;
        }
        throw new Error(`Failed to delete ${direction} tunnel: ${response.status} ${errorText}`);
      }

      logger.info(`${direction} tunnel deleted successfully: ${tunnelName}`);
      return true;
    } catch (error: any) {
      logger.error(`Delete ${direction} tunnel error:`, error);
      throw new Error(`Failed to delete ${direction} tunnel: ${error.message}`);
    }
  }

  /**
   * 获取 ZTM 隧道列表
   */
  async getTunnels(direction?: 'inbound' | 'outbound'): Promise<any[]> {
    try {
      let url = `${this.rootAgentUrl}/api/meshes/${this.meshName}/tunnels`;
      if (direction) {
        url += `/${direction}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to get tunnels: ${response.status} ${errorText}`);
        throw new Error(`Failed to get tunnels: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      logger.info(`Retrieved ${Array.isArray(data) ? data.length : 0} tunnels`);
      
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      logger.error('Get tunnels error:', error);
      throw new Error(`Failed to get tunnels: ${error.message}`);
    }
  }

  /**
   * 验证 ZTM 隧道连接状态
   */
  async validateTunnelConnection(tunnelName: string, protocol: TunnelType, direction: 'inbound' | 'outbound'): Promise<boolean> {
    try {
      const tunnels = await this.getTunnels(direction);
      const tunnelNameToFind = `${protocol.toLowerCase()}/${tunnelName}`;
      
      const tunnelExists = tunnels.some((tunnel: any) => 
        tunnel.name === tunnelNameToFind || 
        tunnel.id === tunnelNameToFind ||
        tunnel.name?.endsWith(`/${tunnelName}`) // 匹配部分名称
      );
      
      return tunnelExists;
    } catch (error: any) {
      logger.error('Validate tunnel connection error:', error);
      return false;
    }
  }
}

export default new ZTMTunnelService();