<!--
Thank you for submitting to the StreamWeaver marketplace.
Please fill in the relevant section below.
-->

## What is this PR adding / updating?

- [ ] New package version (new directory under `packages/<type>/<scope--name>/<version>/`)
- [ ] Yanking an existing version (adding `yanked: true`)
- [ ] Other (please describe)

## Package metadata

- **Id:** `@your-handle/name`
- **Type:** plugin | overlay-component | overlay-component-static | overlay-theme | overlay-preset | template | template-pack | speech-voice
- **Version:** `x.y.z`
- **Artifact:** GitHub Release | raw.githubusercontent.com | external CDN | paid (external)

## Checklist

- [ ] The artifact URL is publicly reachable and returns the correct bytes.
- [ ] The SHA-256 in `artifact.sha256` matches the bytes at the URL. (Leave this field empty for `kind: "external"`.)
- [ ] The id used in `package.json` matches the id inside the artifact's internal manifest.
- [ ] The scope of the id matches my GitHub handle (or an organisation I belong to).
- [ ] I have read [CONTRIBUTING.md](../CONTRIBUTING.md).
