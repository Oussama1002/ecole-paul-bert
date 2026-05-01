<?php

namespace Tests\Feature;

use Tests\TestCase;

class ScheduleApiAuthTest extends TestCase
{
    public function test_schedule_entries_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/schedule-entries')->assertStatus(401);
    }

    public function test_schedule_weekly_requires_authentication(): void
    {
        $this->getJson('/api/v1/schedule/weekly')->assertStatus(401);
    }

    public function test_class_schedule_entries_requires_authentication(): void
    {
        $this->getJson('/api/v1/classes/1/schedule-entries')->assertStatus(401);
    }

    public function test_room_schedule_entries_requires_authentication(): void
    {
        $this->getJson('/api/v1/rooms/1/schedule-entries')->assertStatus(401);
    }

    public function test_teacher_schedule_requires_authentication(): void
    {
        $this->getJson('/api/v1/teachers/1/schedule')->assertStatus(401);
    }
}
