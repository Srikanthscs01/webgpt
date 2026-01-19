import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: ['chat:read', 'chat:write'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}



