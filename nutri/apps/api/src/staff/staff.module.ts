import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { AdminStaffController } from './admin-staff.controller';

@Module({
  controllers: [StaffController, AdminStaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
