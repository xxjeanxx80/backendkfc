import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Use provided password or default to '12345678'
    const password = createUserDto.password || '12345678';
    const hashedPassword = await bcrypt.hash(password, 10);
    // Remove password from DTO as it doesn't exist in entity
    const { password: _, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({
      relations: ['role', 'store'],
    });
  }

  findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role', 'store'],
    });
  }

  findOneByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username },
      relations: ['role', 'store'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Remove password from DTO as it doesn't exist in entity
    const { password, ...restUpdateData } = updateUserDto;
    const updateData: Partial<User> = { ...restUpdateData };

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.userRepository.update(id, updateData);
  }

  remove(id: number) {
    return this.userRepository.softDelete(id);
  }
}
