import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reported_type, reported_id, reason, description } = await req.json();

    // Validate inputs
    if (!reported_type || !reported_id || !reason) {
      return Response.json({ 
        error: 'Missing required fields: reported_type, reported_id, reason' 
      }, { status: 400 });
    }

    const validTypes = ['creation', 'user', 'comment'];
    if (!validTypes.includes(reported_type)) {
      return Response.json({ 
        error: 'Invalid reported_type. Must be creation, user, or comment' 
      }, { status: 400 });
    }

    const validReasons = ['inappropriate', 'spam', 'harassment', 'copyright', 'other'];
    if (!validReasons.includes(reason)) {
      return Response.json({ 
        error: 'Invalid reason' 
      }, { status: 400 });
    }

    // Check for duplicate reports
    const existing = await base44.asServiceRole.entities.Report.filter({
      reporter_email: user.email,
      reported_type,
      reported_id,
      status: 'pending'
    });

    if (existing.length > 0) {
      return Response.json({ 
        error: 'You have already reported this content' 
      }, { status: 409 });
    }

    // Create report
    const report = await base44.entities.Report.create({
      reporter_email: user.email,
      reported_type,
      reported_id,
      reason,
      description: description?.slice(0, 1000) || '', // Limit description length
      status: 'pending'
    });

    return Response.json({ success: true, report_id: report.id }, { status: 201 });
  } catch (error) {
    console.error('Report validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});