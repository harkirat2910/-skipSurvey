import { NextResponse } from 'next/server';

const SENTRY_API_BASE = 'https://sentry.io/api/0';

interface SentryEvent {
    eventID: string;
    id: string;
    projectID: string;
    title: string;
    message: string;
    dateCreated: string;
    tags: { key: string; value: string }[];
    entries: any[];
}

export async function findRelatedSentryEvent(sessionId: string, knownEventId?: string): Promise<any | null> {
    const authToken = process.env.SENTRY_AUTH_TOKEN;
    const orgSlug = process.env.SENTRY_ORG;
    const projectSlug = process.env.SENTRY_PROJECT;

    if (!authToken || !orgSlug || !projectSlug) {
        return null;
    }

    try {
        let projectId = projectSlug;
        // Resolve project ID if needed (for Discover queries)
        if (isNaN(Number(projectSlug))) {
            // ... checking cache or fetching ... 
            // Simplified for brevity: assuming we might need it for discover, 
            // but for direct event ID fetch we might use project slug? 
            // Sentry API /organizations/{organization_slug}/events/{project_slug}:{event_id}/ exists?
        }

        // STRATEGY 1: Direct Fetch if we have ID
        if (knownEventId) {
            console.log(`Fetching Sentry Event by ID: ${knownEventId}`);
            // Endpoint: https://sentry.io/api/0/projects/{organization_slug}/{project_slug}/events/{event_id}/
            const url = `${SENTRY_API_BASE}/projects/${orgSlug}/${projectSlug}/events/${knownEventId}/`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (res.ok) {
                const event = await res.json();
                console.log('Found Sentry Event via Direct ID');
                return {
                    sentry_event_id: event.eventID,
                    sentry_issue_id: event.groupID,
                    title: event.title,
                    permalink: `${SENTRY_API_BASE}/organizations/${orgSlug}/issues/${event.groupID}/events/${event.eventID}/`
                };
            } else {
                console.warn('Direct fetch failed, falling back to search.', res.status);
            }
        }

        // STRATEGY 2: Discover Search (Fallback)
        console.log(`Searching Sentry for session: ${sessionId}`);

        // 0. Resolve Project Slug to ID
        // projectId is already declared in the outer scope
        if (isNaN(Number(projectSlug))) {
            const projectsUrl = `${SENTRY_API_BASE}/projects/`;
            console.log(`Resolving Project Slug: ${projectSlug} via ${projectsUrl}`);
            const projRes = await fetch(projectsUrl, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (projRes.ok) {
                const projects = await projRes.json();
                const matchedProject = projects.find((p: any) => p.slug === projectSlug);
                if (matchedProject) {
                    projectId = matchedProject.id;
                    console.log(`✅ Resolved Sentry Project: ${projectSlug} -> ${projectId}`);
                } else {
                    console.warn(`❌ Project slug '${projectSlug}' not found in accessible projects.`);
                }
            } else {
                console.error(`❌ Failed to list projects. Status: ${projRes.status}`);
            }
        }

        const query = `tags.silent_session_id:${sessionId}`;
        const fields = '&field=id&field=title&field=issue.id&field=timestamp';
        const url = `${SENTRY_API_BASE}/organizations/${orgSlug}/events/?project=${projectId}&query=${encodeURIComponent(query)}${fields}&sort=-timestamp&limit=1`;

        console.log(`Sentry Search URL: ${url}`);

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`❌ Sentry Search Failed. Status: ${res.status}. Body: ${errText}`);
            return null;
        }

        const events = await res.json();
        console.log(`Sentry Search Results: ${events?.data?.length || 0} events found.`);

        if (events?.data?.length > 0) {
            const event = events.data[0];
            return {
                sentry_event_id: event.id,
                sentry_issue_id: event['issue.id'] || event.issue_id || event.groupID,
                title: event.title,
                permalink: `${SENTRY_API_BASE}/organizations/${orgSlug}/issues/${event['issue.id'] || event.issue_id || event.groupID}/events/${event.id}/`
            };
        }

        return null;

    } catch (error) {
        console.error('Sentry Fetch Error:', error);
        return null;
    }
}
