import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blocked_email } = await req.json();

    // Validate input
    if (!blocked_email || !blocked_email.includes('@')) {
      return Response.json({ 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    // Prevent self-blocking
    if (blocked_email === user.email) {
      return Response.json({ 
        error: 'You cannot block yourself' 
      }, { status: 400 });
    }

    // Verify target user exists
    const targetUsers = await base44.asServiceRole.entities.User.list();
    const targetExists = targetUsers.some(u => u.email === blocked_email);
    
    if (!targetExists) {
      return Response.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Block validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});