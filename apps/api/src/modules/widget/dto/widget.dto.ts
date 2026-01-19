import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  Max,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WidgetChatDto {
  @ApiProperty({ example: 'How do I get started?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  siteKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class WidgetThemeDto {
  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  backgroundColor?: string;

  @ApiPropertyOptional({ example: '#1F2937' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  textColor?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(32)
  borderRadius?: number;

  @ApiPropertyOptional({ enum: ['bottom-right', 'bottom-left'] })
  @IsOptional()
  @IsEnum(['bottom-right', 'bottom-left'])
  position?: 'bottom-right' | 'bottom-left';

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  offsetX?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  offsetY?: number;
}

export class WidgetRateLimitDto {
  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rpm?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  burst?: number;
}

export class UpdateWidgetConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetThemeDto)
  theme?: WidgetThemeDto;

  @ApiPropertyOptional({ example: 'Hi! How can I help you today?' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  greeting?: string;

  @ApiPropertyOptional({ example: 'Type your message...' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional({ example: 'WebGPT' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brandName?: string | null;

  @ApiPropertyOptional({ example: ['example.com', 'docs.example.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetRateLimitDto)
  rateLimit?: WidgetRateLimitDto;
}



