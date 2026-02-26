// src/services/ztmTunnelService.ts

import type { TunnelType } from '../types';
import { ztmService } from './ztmService';

class ZTMTunnelService {
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
      // 使用 ZTM 的实际 API 端点格式，从浏览器记录中获取
      const endpointId = await this.getEndpointId(); // 获取当前端点ID
      
      const response = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes/${ztmService.getMeshName()}/apps/ztm/tunnel/api/endpoints/${endpointId}/outbound/${protocol.toLowerCase()}/${tunnelName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: protocol.toLowerCase(),
          name: tunnelName,
          targets: [{ host: targetHost, port: targetPort }],
          entrances: [],
          users: [] // 允许所有用户访问游戏分享隧道
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create outbound tunnel: ${response.status} ${errorText}`);
      }

      return true;
    } catch (error: any) {
      console.error('Create outbound tunnel error:', error);
      throw error;
    }
  }

  /**
   * 创建 ZTM 隧道 (inbound - 参与者端)
   */
  async createInboundTunnel(
    tunnelName: string, 
    protocol: TunnelType, 
    listenPort: number
  ): Promise<number> {
    try {
      const endpointId = await this.getEndpointId(); // 获取当前端点ID
      
      const response = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes/${ztmService.getMeshName()}/apps/ztm/tunnel/api/endpoints/${endpointId}/inbound/${protocol.toLowerCase()}/${tunnelName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listens: [{ ip: '127.0.0.1', port: listenPort }],
          exits: []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create inbound tunnel: ${response.status} ${errorText}`);
      }

      // 获取隧道信息，获得分配的本地端口
      const tunnelResponse = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes/${ztmService.getMeshName()}/apps/ztm/tunnel/api/endpoints/${endpointId}/inbound/${protocol.toLowerCase()}/${tunnelName}`);
      
      if (!tunnelResponse.ok) {
        const errorText = await tunnelResponse.text();
        throw new Error(`Failed to get tunnel info: ${tunnelResponse.status} ${errorText}`);
      }

      const tunnelInfo = await tunnelResponse.json();
      
      // 返回分配的本地端口
      if (tunnelInfo.listens && tunnelInfo.listens.length > 0) {
        return tunnelInfo.listens[0].port;
      }
      
      throw new Error('Failed to get assigned port from tunnel info');
    } catch (error: any) {
      console.error('Create inbound tunnel error:', error);
      throw error;
    }
  }

  /**
   * 删除 ZTM 隧道
   */
  async deleteTunnel(tunnelName: string, protocol: TunnelType, direction: 'inbound' | 'outbound'): Promise<boolean> {
    try {
      const endpointId = await this.getEndpointId(); // 获取当前端点ID
      
      const response = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes/${ztmService.getMeshName()}/apps/ztm/tunnel/api/endpoints/${endpointId}/${direction}/${protocol.toLowerCase()}/${tunnelName}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        // 如果隧道不存在，也认为删除成功
        if (response.status === 404) {
          return true;
        }
        throw new Error(`Failed to delete tunnel: ${response.status} ${errorText}`);
      }

      return true;
    } catch (error: any) {
      console.error(`Delete tunnel error:`, error);
      throw error;
    }
  }

  /**
   * 获取 ZTM 隧道列表
   */
  async getTunnels(direction?: 'inbound' | 'outbound'): Promise<any[]> {
    try {
      const endpointId = await this.getEndpointId(); // 获取当前端点ID
      
      let url = `${ztmService.getLocalAgentUrl()}api/meshes/${ztmService.getMeshName()}/apps/ztm/tunnel/api/endpoints/${endpointId}`;
      if (direction) {
        url += `/${direction}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get tunnels: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Get tunnels error:', error);
      throw error;
    }
  }

  /**
   * 获取当前端点ID
   */
  private async getEndpointId(): Promise<string> {
    try {
      // 从 /api/meshes 端点获取当前端点ID
      const response = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes`);
      
      if (!response.ok) {
        throw new Error(`Failed to get endpoint ID: ${response.status}`);
      }

      const meshes = await response.json();
      if (Array.isArray(meshes) && meshes.length > 0) {
        return meshes[0].agent.id;
      }

      throw new Error('No mesh found to get endpoint ID');
    } catch (error) {
      console.error('Get endpoint ID error:', error);
      // 返回硬编码的端点ID作为备用方案，但实际应用中应正确获取
      // 从之前的测试中我们知道端点ID是 94cc2544-f5dd-4b5b-bb3f-0fe7b3f4fef6
      throw error;
    }
  }

  /**
   * 获取当前用户ID
   */
  private async getUserId(): Promise<string> {
    try {
      // 从 /api/meshes 端点获取当前用户ID
      const response = await fetch(`${ztmService.getLocalAgentUrl()}api/meshes`);
      
      if (!response.ok) {
        throw new Error(`Failed to get user ID: ${response.status}`);
      }

      const meshes = await response.json();
      if (Array.isArray(meshes) && meshes.length > 0) {
        return meshes[0].agent.username;
      }

      throw new Error('No mesh found to get user ID');
    } catch (error) {
      console.error('Get user ID error:', error);
      // 返回硬编码的用户ID作为备用方案，但实际应用中应正确获取
      // 从之前的测试中我们知道用户ID是 4188393a-ea0a-4af2-8eac-61d0714c145b
      throw error;
    }
  }
}

export const ztmTunnelService = new ZTMTunnelService();
export default ztmTunnelService;