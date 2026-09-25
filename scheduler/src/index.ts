import { publish, type CmsEnv } from "../../cms/server/publish";
import { deleteDraft, dueScheduled, getDraft, listDrafts, setScheduled } from "../../cms/server/store";

/**
 * Every ten minutes: publish whatever scheduled post has come due.
 *
 * Each one is published on its own, so one bad post (a slug someone took in
 * the meantime, say) is logged and left scheduled rather than holding up the
 * rest. A post that fails keeps failing loudly in the logs until it's fixed in
 * the admin; it's never published half-way.
 */
export default {
  async scheduled(_event: ScheduledController, env: CmsEnv): Promise<void> {
    for (const id of await dueScheduled(env)) {
      const draft = await getDraft(env, id);
      if (!draft || draft.status !== "scheduled") {
        await setScheduled(env, id, null); // a stale marker
        continue;
      }
      try {
        await publish(env, draft, "Published on schedule");
        console.log(`published ${id} “${draft.title}”`);
      } catch (error) {
        console.error(`couldn't publish ${id}:`, error instanceof Error ? error.message : error);
      }
    }

    // Trash empties itself: anything deleted more than 60 days ago goes for good.
    // Once an hour is plenty (the cron runs every ten minutes).
    if (new Date().getUTCMinutes() < 10) {
      const cutoff = Date.now() - 60 * 864e5;
      for (const d of await listDrafts(env)) {
        if (d.trashedAt && Date.parse(d.trashedAt) < cutoff) await deleteDraft(env, d.id);
      }
    }
  },
} satisfies ExportedHandler<CmsEnv>;
