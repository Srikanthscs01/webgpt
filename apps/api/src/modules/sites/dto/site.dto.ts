import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CrawlConfigDto {
  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  maxPages?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxDepth?: number;

  @ApiPropertyOptional({ default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({ default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  respectRobots?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sitemapOnly?: boolean;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  concurrency?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  delayMs?: number;
}

export class CreateSiteDto {
  @ApiProperty({ example: 'My Website' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsUrl()
  @IsNotEmpty()
  baseUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CrawlConfigDto)
  crawlConfig?: CrawlConfigDto;
}

export class UpdateSiteDto {
  @ApiPropertyOptional({ example: 'Updated Website Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CrawlConfigDto)
  crawlConfig?: CrawlConfigDto;
}



