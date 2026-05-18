# Contributing

Thanks for publishing to the StreamWeaver marketplace.

## Before you submit

- Pick an id of the form `@scope/name`. The scope is your GitHub handle (or organisation) prefixed with `@`. The `@streamweaver/*` scope is reserved for first-party packages and rejected automatically from third-party PRs.
- Your artifact must be reachable via HTTPS. GitHub Release assets, `raw.githubusercontent.com` URLs from your own repo, and your own CDN all work.
- The id used in your `package.json` manifest must match the id encoded in the package itself (e.g. the `id` inside `plugin.manifest.json` for plugins).

## Submission steps

1. Fork this repository.
2. Add a single new file at `packages/<type>/<scope--name>/<version>/package.json`. `<scope--name>` is the path-safe form of `@scope/name` (slash replaced with double-dash).
3. Optionally include a README, icon, and screenshots in the same folder.
4. For blueprint templates and template packs: include the actual `.swtemplate.json` / `.swtemplate-pack.json` alongside the manifest. The artifact is inlined in the marketplace repo for these tiny text-only types.
5. Open a PR. CI runs:
    - JSON schema validation against `registry/schema/package.schema.json`.
    - Reachability check on `artifact.sourceUrl`.
    - For non-external artifacts: download + SHA-256 computation; the result is written back into your PR.
    - Type-specific lint (CSP for static overlays, manifest cross-check for plugins, template lint for templates).
6. A maintainer reviews and merges. The `publish-registry` workflow regenerates the per-type shards. The `publish-site` workflow redeploys the browse site.

## Updating an existing package

Open a new PR adding a new `<version>` directory alongside the existing ones. Never modify a previously-merged version — clients have pinned that hash. Bump the version and submit a new one instead.

## Yanking a published version

If you discover a serious issue with a published version, open a PR adding `yanked: true` and `verificationFailureReason: "<reason>"` to that version's `package.json`. Yanked versions stay visible in the catalog with a clear badge so locally-installed copies can show the warning. The bytes are not removed (clients with the version locked in their lockfile keep working).

## Paid packages

Set `artifact.kind: "external"`, omit the SHA, and include `purchaseUrl` + `priceHint`. CI HEAD-checks the purchase URL for reachability but does not attempt to download. The in-app catalog shows a "Buy on author site" button instead of Install.

## What you cannot do via this catalog

- Distribute a package that requires non-MIT bundled dependencies you don't have a license to redistribute. The catalog hosts metadata only; you control the bytes.
- Use someone else's id. The marketplace will reject a PR claiming an id whose scope you don't own.
- Replace the bytes at a previously-published version's URL without bumping the version. Clients hash-check on download and will refuse.
