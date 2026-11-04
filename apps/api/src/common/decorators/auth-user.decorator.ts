import { createDecorator } from '@nestjs/common';

export const AuthUser = () => createDecorator<any>();
