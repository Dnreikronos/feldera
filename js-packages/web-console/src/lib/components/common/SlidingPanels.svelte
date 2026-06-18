<script lang="ts" generics="K extends string">
  import { fly } from 'svelte/transition'
  import type { Snippet } from '$lib/types/svelte'

  /**
   * A single-cell carousel: shows exactly one of `pages` at a time and slides the
   * outgoing and incoming pages past each other when `current` changes. Used to
   * give a small popup multiple "pages" (e.g. a menu and a detail view) that
   * animate like a phone settings screen, without the caller tracking direction.
   */
  let {
    current,
    pages,
    width = 220,
    duration = 200,
    class: className = ''
  }: {
    /** Key of the page to show. Must match one of `pages[].key`. */
    current: K
    /** Pages in navigation order. Index 0 is the root. */
    pages: { key: K; content: Snippet }[]
    /** Horizontal slide distance, in pixels. */
    width?: number
    /** Transition duration, in milliseconds. */
    duration?: number
    class?: string
  } = $props()
</script>

<!-- Every page lives in the same grid cell so the outgoing and incoming pages
     overlap and slide past each other like carousel slides. The root page (index
     0) is anchored to the left and every deeper page enters from the right, so
     forward and back navigation animate as mirrored sweeps — no direction state
     to track. -->
<div class="grid {className}">
  {#each pages as page, i (page.key)}
    {#if page.key === current}
      {@const x = i === 0 ? -width : width}
      <div
        in:fly={{ x, duration }}
        out:fly={{ x, duration }}
        class="col-start-1 row-start-1 flex flex-col"
      >
        {@render page.content()}
      </div>
    {/if}
  {/each}
</div>
