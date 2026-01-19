import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

export interface ApiKeyUser {
  workspaceId: string;
  scopes: string[];
  keyId: string;
  type: 'api-key';
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<ApiKeyUser> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const result = await this.authService.validateApiKey(apiKey);

    if (!result) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      workspaceId: result.workspaceId,
      scopes: result.scopes,
      keyId: result.keyId,
      type: 'api-key',
    };
  }
}



