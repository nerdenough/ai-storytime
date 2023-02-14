<script>
  import { fly } from 'svelte/transition'
  import { quintOut } from 'svelte/easing'
  import { getContextClient, gql, queryStore } from '@urql/svelte'
  import { onMount } from 'svelte'

  export let data
  let { identifier } = data
  let currentPage = -1
  let previousPage = -1

  const qs = queryStore({
    client: getContextClient(),
    query: gql`
      query getBook($identifier: String!) {
        book {
          get(identifier: $identifier) {
            identifier
            prompt
            title
            characters {
              name
              description
            }
            pages {
              text
              image {
                caption
                url
              }
            }
          }
        }
      }
    `,
    variables: { identifier },
  })

  let book = $qs.data?.book?.get

  onMount(() => {
    document.onkeydown = (e) => {
      previousPage = currentPage
      if (e.key === 'ArrowRight' && currentPage < book.pages.length) {
        currentPage++
      } else if (e.key === 'ArrowLeft' && currentPage >= 0) {
        currentPage--
      }
      console.log(previousPage, currentPage)
    }
  })
</script>

<div
  class="bg-black text-white text-center font-book absolute flex w-screen h-screen items-center justify-center overflow-hidden"
>
  {#if book}
    {#key currentPage}
      <div
        transition:fly={{
          x: currentPage >= previousPage ? 1000 : -1000,
          duration: 2000,
          easing: quintOut,
        }}
        class="absolute w-screen p-48"
      >
        {#if currentPage === -1}
          <h1 class="text-6xl font-bold">
            {book.title}
          </h1>
          <h2 class="text-xl">
            Written by ChatGPT and illustrated by Stable Diffusion
          </h2>
        {/if}
        {#each book.pages as page, i}
          {#if currentPage === i}
            <p class="text-3xl">{page.text}</p>
          {/if}
        {/each}
        {#if currentPage === book.pages.length}
          <h1 class="text-5xl font-bold">The End</h1>
        {/if}
      </div>
    {/key}
  {/if}
</div>
