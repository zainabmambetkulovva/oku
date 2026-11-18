/**
 * Явный список библиотек сервера для сборки Vercel.
 *
 * Vercel кладёт в функцию только пакеты, которые видит из входного файла (main.ts).
 * Модуль приложения подключается в main.ts динамически (чтобы ошибки запуска
 * показывались на /api/v1/health), и его зависимости сборка не находит — функция
 * падала с «Cannot find module». Импорты ниже делают все пакеты видимыми.
 * Список = dependencies из package.json; при добавлении зависимости — добавить и сюда
 * (это проверяет vercel-deps.spec.ts).
 */
import '@aws-sdk/client-s3';
import '@aws-sdk/s3-presigned-post';
import '@aws-sdk/s3-request-presigner';
import '@nestjs/common';
import '@nestjs/config';
import '@nestjs/core';
import '@nestjs/event-emitter';
import '@nestjs/jwt';
import '@nestjs/passport';
import '@nestjs/platform-express';
import '@nestjs/schedule';
import '@nestjs/swagger';
import '@nestjs/throttler';
import '@prisma/client';
import 'bcrypt';
import 'class-transformer';
import 'class-validator';
import 'cookie-parser';
import 'helmet';
import 'ioredis';
import 'nodemailer';
import 'passport';
import 'passport-jwt';
import 'reflect-metadata';
import 'rxjs';
import 'zod';
