# Sentry off switch

## Keep installed, stop telemetry

```sh
npm run sentry:off
# Restore later:
npm run sentry:on
```

These commands edit the same flag below. They do not uninstall packages.

Edit `sentry.settings.json` at the project root:

```json
{ "enabled": false }
```

Restart the development server. For the deployed site, rebuild and redeploy; already-open tabs must reload to receive the new build.

This skips browser, server and edge initialization, Replay/profiling integration creation, router/request hooks, and the Sentry build wrapper including source-map uploads. Existing logger calls become inactive without an initialized SDK. Other analytics providers are independent.

Set `enabled` back to `true` and rebuild to restore Sentry. It is currently left enabled. This switch does not change or cancel your Sentry subscription.

The enabled configuration is intentionally limited to public error locations.
Admin, Seneca, and API error events are dropped. Error messages, user details,
breadcrumbs, request bodies and headers are omitted; stack locations retain no
URL query strings. Replay, performance traces, profiles, logs and metrics are
disabled. This reduces diagnostic detail to protect journal and financial data.
PostHog uses its own private-route filter; the Sentry switch does not control it.

## Remove Sentry after the trial

Stop the development server first. Preview the exact cleanup:

```sh
npm run sentry:remove
```

Apply when ready:

```sh
npm run sentry:remove -- --apply
```

This removes the dedicated configuration, instrumentation, diagnostic page, logger and Sentry integration tests. It preserves the application's error screen and retry button, restores the plain Next.js configuration, removes local Sentry environment variables and the profiling response header, and runs npm uninstall for both Sentry packages. npm updates package.json, package-lock.json and node_modules, pruning dependencies no longer needed by other packages. The on/off scripts are removed too.

If additional Sentry consumers have been added, the command stops before editing and identifies the file to migrate. Review the preview before applying, especially if instrumentation files have acquired non-Sentry behavior. Source cleanup removes only named files; it never recursively removes source directories. If npm fails after source cleanup, rerun the same command to finish uninstalling.

Then run `npm run typecheck` and `npm run build`, deploy the new build, and reload open tabs. Remove SENTRY_* secrets from your hosting/CI settings separately. Previously deployed builds and data already stored in Sentry are unaffected; canceling a subscription is a separate account action.
