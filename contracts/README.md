# API contracts and visual reference

[openapi.yaml](openapi.yaml) is the canonical business HTTP contract. It defines the contracted endpoints, methods, request/response schemas, validation rules, examples and error responses. Edit that file when an approved API change is implemented; generated views are not separate contracts.

## Open the visual reference

Open [the generated API reference](../reports/api-reference/index.html) in your browser. Expand **Enquiries**, then choose **Save a synthetic local enquiry**. You can inspect the request header/body fields, examples, response codes and referenced response schemas. Opening this documentation does not require the app or database to be running.

The generated HTML is saved at `reports/api-reference/index.html`. It embeds the contract and documentation scripts and is ignored by Git; regenerate it after a fresh checkout or contract changes. Source identity and rendering evidence for the current handoff are recorded in `reports/api-reference/verification.json` and the iteration history.

## Regenerate from the canonical contract

Use the project's installed dependencies. On first setup or after the lockfile changes, run `npm ci` first. Then, from PowerShell:

```powershell
Set-Location 'D:\Projects\stratadrive'
node node_modules/@redocly/cli/bin/cli.js build-docs contracts/openapi.yaml --inlineBundle --output reports/api-reference/index.html --title 'StrataDrive API reference'
```

Refresh or reopen the generated HTML after it completes. Do not manually edit its endpoints or schemas. The renderer's optional public branding image is not needed to read the contract offline.

## Documentation and runtime addresses

The viewer documents the contract; the endpoint URL itself is not a browser documentation page. The canonical contract's server address, `http://127.0.0.1:3100`, is the isolated automated validation target. Owner application review uses `http://127.0.0.1:3000`. This guide does not start either server or send an enquiry.

Use synthetic data only when executing manual/API tests. Follow [the manual walkthrough](../docs/manual-testing.md#enquiry-review) for startup, safe sample submissions and cleanup. Page routes such as `/book` and `/enquire` are UI screens rather than additional contracted business APIs.

## Keep the contract and clients aligned

For every approved API addition, change or removal, update this canonical contract and the affected [Postman requests/environment](../postman/README.md) together. Include changed request/response fields, access rules, examples, status codes, assertions and the collection's source identity. Refresh generated runtime schemas when needed, regenerate the visual reference, and update affected manual cases and the current workbook's **Start Here → API testing** section before handoff.

Run `npm run contracts:check` and the affected client/artifact checks. Record actual execution separately from planned coverage and owner acceptance. Preserve earlier workbooks/results and the owner's current Postman keys/receipts before an updated import. The [agent workflow](../docs/agent-workflow.md#api-contracts-and-postman-maintenance) records this standing maintenance rule.

## Related references

- [Postman collection and local environment](../postman/README.md) — importable manual requests and expected results
- [Architecture and API standards](../docs/architecture.md#canonical-http-contract)
- [Requirements and test traceability](../docs/requirements.yaml)
- [Technology stack](../docs/tech-stack.md)
- [Testing and independent CI](../docs/testing-and-ci.md)

`npm run contracts:check` validates the canonical document/examples and checks generated runtime schema drift. [Iteration history](../docs/iterations/1b.md) records actual execution evidence and pending owner acceptance separately.
