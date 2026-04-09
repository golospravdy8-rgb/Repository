import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name is too long'),
  description: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

type AddTeamRequest = z.infer<typeof AddTeamSchema>;

/**
 * POST /api/teams/add
 *
 * Add a new team to Supabase
 *
 * Request body:
 * {
 *   "name": "Team Name",
 *   "description": "Optional description",
 *   "photoUrl": "https://example.com/image.jpg"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { team object },
 *   "message": "Team added successfully"
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const validationResult = AddTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, description, photoUrl } = validationResult.data;

    // Insert into Supabase
    // Note: Actual table structure has 'logo' instead of 'photo_url'
    const { data, error } = await supabase
      .from('teams')
      .insert([
        {
          name,
          logo: photoUrl || null,
          // description field not in actual table schema
        },
      ])
      .select();

    if (error) {
      console.error('[/api/teams/add] Supabase error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add team',
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log('[/api/teams/add] Team added successfully:', data);

    return NextResponse.json(
      {
        success: true,
        data: data[0],
        message: 'Team added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[/api/teams/add] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams/add
 *
 * Health check / documentation endpoint
 */

export async function GET() {
  return NextResponse.json({
    message: 'Teams API endpoint',
    method: 'POST',
    endpoint: '/api/teams/add',
    description: 'Add a new team to Supabase',
    example: {
      name: 'Team Name',
      description: 'Optional description',
      photoUrl: 'https://example.com/image.jpg',
    },
  });
}
