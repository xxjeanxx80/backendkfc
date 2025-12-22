import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    this.logger.log(`Creating new supplier: ${createSupplierDto.name}`);

    try {
      // Validate required fields
      if (!createSupplierDto.name || createSupplierDto.name.trim() === '') {
        throw new BadRequestException('Supplier name is required');
      }

      // Validate name length
      if (createSupplierDto.name.length < 2) {
        throw new BadRequestException(
          'Supplier name must be at least 2 characters long',
        );
      }

      // Validate email format if provided
      if (createSupplierDto.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createSupplierDto.email)) {
          throw new BadRequestException('Invalid email format');
        }
      }

      // Validate phone format if provided
      if (createSupplierDto.phone) {
        const phoneRegex = /^\+?[\d\s()-]+$/;
        if (!phoneRegex.test(createSupplierDto.phone)) {
          throw new BadRequestException('Invalid phone number format');
        }
      }

      // Validate lead time
      if (
        createSupplierDto.leadTimeDays !== undefined &&
        createSupplierDto.leadTimeDays < 0
      ) {
        throw new BadRequestException('Lead time cannot be negative');
      }

      // Validate reliability score
      if (createSupplierDto.reliabilityScore !== undefined) {
        if (
          createSupplierDto.reliabilityScore < 0 ||
          createSupplierDto.reliabilityScore > 100
        ) {
          throw new BadRequestException(
            'Reliability score must be between 0 and 100',
          );
        }
      }

      // Check for duplicate supplier name
      const existingSupplier = await this.supplierRepository.findOne({
        where: { name: createSupplierDto.name },
      });

      if (existingSupplier) {
        throw new BadRequestException(
          `Supplier with name '${createSupplierDto.name}' already exists`,
        );
      }

      const supplier = this.supplierRepository.create(createSupplierDto);
      const savedSupplier = await this.supplierRepository.save(supplier);

      this.logger.log(`Supplier created successfully: ${savedSupplier.id}`);
      return savedSupplier;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create supplier: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create supplier', {
        cause: error,
      });
    }
  }

  async findAll() {
    this.logger.log('Fetching all suppliers');
    try {
      const suppliers = await this.supplierRepository.find();
      this.logger.log(`Found ${suppliers.length} suppliers`);
      return suppliers;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch suppliers: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch suppliers', {
        cause: error,
      });
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching supplier with ID: ${id}`);
    try {
      const supplier = await this.supplierRepository.findOneBy({ id });
      if (!supplier) {
        this.logger.warn(`Supplier with ID ${id} not found`);
      }
      return supplier;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch supplier ${id}: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch supplier', {
        cause: error,
      });
    }
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    this.logger.log(`Updating supplier with ID: ${id}`);
    try {
      const result = await this.supplierRepository.update(
        id,
        updateSupplierDto,
      );
      if (result.affected === 0) {
        this.logger.warn(`Supplier with ID ${id} not found for update`);
        throw new BadRequestException('Supplier not found');
      }
      this.logger.log(`Supplier ${id} updated successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update supplier ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update supplier', {
        cause: error,
      });
    }
  }

  async remove(id: number) {
    this.logger.log(`Soft deleting supplier with ID: ${id}`);
    try {
      const result = await this.supplierRepository.softDelete(id);
      if (result.affected === 0) {
        this.logger.warn(`Supplier with ID ${id} not found for deletion`);
        throw new BadRequestException('Supplier not found');
      }
      this.logger.log(`Supplier ${id} soft-deleted successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete supplier ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete supplier', {
        cause: error,
      });
    }
  }
}
