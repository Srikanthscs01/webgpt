import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ example: 'How do I get started?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiProperty()
  @IsUUID()
  siteId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class SearchDto {
  @ApiProperty({ example: 'getting started tutorial' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  query: string;

  @ApiProperty()
  @IsUUID()
  siteId: string;
}



