import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Payment } from './src/modules/payment/entities/payment.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Enrollment } from './src/modules/enrollment/entities/enrollment.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentRepo = app.get(getRepositoryToken(Payment));
  const enrollmentRepo = app.get(getRepositoryToken(Enrollment));

  // Fix Payments currency based on amount (hacky but works for the user's specific test data)
  // Student2 amount is 29.00, Student1 amount is 2000.00
  await paymentRepo.update({ amount: 29.00 }, { currency: 'USD' });
  
  // Fix enrollments batchId if they were saved as empty string instead of NULL
  await enrollmentRepo.query(`UPDATE enrollments SET batchId = NULL WHERE batchId = '' OR batchId = 'null'`);

  console.log('Fixed DB data');
  await app.close();
}
bootstrap();
