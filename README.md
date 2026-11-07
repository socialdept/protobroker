# proto.broker

Run confidential AT Protocol OAuth clients on local domains without a tunnel.

proto.broker gives an app on a local domain such as `https://app.test` a real confidential client: `private_key_jwt` client authentication, signed client assertions and confidential-client session lifetimes, exactly as it will run in production. It hosts the client metadata and relays the OAuth callback back to your machine. It is stateless: everything a client needs is encoded in the client id itself, so the service has no database and holds no secrets. To learn all about it, head over to [the documentation](https://socialde.pt/docs/protobroker).

Here are a few short examples of what you can do. Create a client for your local app, with a fresh P-256 key:

```sh
bun run client --callback https://app.test/oauth/callback --scope "atproto transition:generic" --name "My app"
```

The script prints the values your app's config needs, then a PEM private key that never leaves your machine:

```
client_id     https://proto.broker/v1/<blob>
redirect_uri  https://proto.broker/v1/<blob>/callback
scope         atproto transition:generic
kid           <thumbprint>
```

The client id is a URL the authorization server fetches for your client metadata:

```sh
curl https://proto.broker/v1/<blob>
```

Or run a broker of your own, as a Cloudflare Worker or as a Bun server in Docker:

```sh
docker build -t protobroker .
docker run -p 8787:8787 -e PUBLIC_URL=https://broker.example.com protobroker
```

## Documentation

You'll find the documentation on [https://socialde.pt/docs/protobroker](https://socialde.pt/docs/protobroker).

Find yourself stuck using proto.broker? Found a bug? Do you have general questions or suggestions for improving it? Feel free to [create an issue on GitHub](https://github.com/socialdept/protobroker/issues).

## Testing

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
```

## License

The MIT License (MIT). Please see [LICENSE](LICENSE) for more information.
