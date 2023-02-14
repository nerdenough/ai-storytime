<script>
  import { createClient, setContextClient } from '@urql/svelte'
  import '../app.css'

  const client = createClient({
    url: 'http://localhost:4000/graphql',
  })
  setContextClient(client)
</script>

<slot />
