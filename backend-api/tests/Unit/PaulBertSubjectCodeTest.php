<?php

namespace Tests\Unit;

use App\Support\PaulBertSubjectCode;
use PHPUnit\Framework\TestCase;

class PaulBertSubjectCodeTest extends TestCase
{
    public function test_prefix_from_demo_subjects(): void
    {
        $this->assertSame('ANG', PaulBertSubjectCode::prefixFromName('Anglais'));
        $this->assertSame('FR', PaulBertSubjectCode::prefixFromName('Français'));
        $this->assertSame('MATH', PaulBertSubjectCode::prefixFromName('Mathématiques'));
        $this->assertSame('SCI', PaulBertSubjectCode::prefixFromName('Sciences'));
        $this->assertSame('HG', PaulBertSubjectCode::prefixFromName('Histoire-Géographie'));
        $this->assertSame('EPS', PaulBertSubjectCode::prefixFromName('EPS'));
    }

    public function test_from_name_appends_pb_suffix(): void
    {
        $code = PaulBertSubjectCode::fromName('Anglais', fn (string $c) => false);
        $this->assertSame('ANG-PB', $code);
    }

    public function test_from_name_avoids_collision(): void
    {
        $taken = ['ANG-PB'];
        $code = PaulBertSubjectCode::fromName('Anglais', fn (string $c) => in_array($c, $taken, true));
        $this->assertSame('ANG-PB-2', $code);
    }
}
