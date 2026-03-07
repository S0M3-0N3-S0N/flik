import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_data } = await req.json();

    // Only create notification if this is a reply
    if (!message_data.parent_message_id || !message_data.original_message_author_email) {
      return Response.json({ success: false });
    }

    // Get the sender's email
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Don't notify if user is replying to their own message
    if (user.email === message_data.original_message_author_email) {
      return Response.json({ success: true });
    }

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: message_data.original_message_author_email,
      actor_email: user.email,
      type: 'message_reply',
      content: `${user.full_name} replied to your message in World Chat`,
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});