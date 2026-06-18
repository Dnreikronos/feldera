<script lang="ts">
  import { Tooltip } from 'common-ui'
  import { slide } from 'svelte/transition'
  import Popup from '$lib/components/common/Popup.svelte'
  import SlidingPanels from '$lib/components/common/SlidingPanels.svelte'
  import { useUpdatePipelineList } from '$lib/compositions/pipelines/usePipelineList.svelte'
  import type { PipelineManagerApi } from '$lib/compositions/usePipelineManager.svelte'
  import { partition } from '$lib/functions/common/array'
  import {
    tagColorIndexOf,
    tagColorOf,
    tagColorPalette,
    tagDisplayName,
    tagWithColor
  } from '$lib/functions/pipelines/tags'

  let {
    pipelineName,
    tags,
    knownTags,
    api
  }: {
    /** Name of the pipeline these tags belong to. */
    pipelineName: string
    /** Tags currently applied to this pipeline. */
    tags: string[]
    /** Every tag known across all pipelines — the pool the popup picks from. */
    knownTags: Set<string>
    /** Pipeline Manager client used to persist tag edits. */
    api: PipelineManagerApi
  } = $props()

  // Tag edits update the pipeline optimistically and patch the server; the next
  // list refresh reconciles with the server, which owns `tags`.
  const { updatePipeline, discardPendingListRefresh } = useUpdatePipelineList()
  const setTags = (next: string[]) => {
    updatePipeline(pipelineName, (p) => ({ ...p, tags: next }))
    discardPendingListRefresh()
    api.patchPipeline(pipelineName, { tags: next })
  }
  const toggleTag = (tag: string) => {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
  }
  const createTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  // At most two tags fit in the row; the rest collapse into a "+N" chip.
  const inlineTags = $derived(tags.slice(0, 2))
  const overflowCount = $derived(Math.max(0, tags.length - 2))

  let page = $state<'list' | 'create'>('list')
  let search = $state('')
  let newTagName = $state('')
  // Palette index the user has chosen for the tag being created; encoded as
  // trailing-space padding on submit (see `tagWithColor`).
  let newTagColorIndex = $state(0)

  const matchesSearch = (text: string) =>
    tagDisplayName(text).toLowerCase().includes(search.trim().toLowerCase())

  // Selected tags float to the top; both groups are sorted a–z (see design).
  const byText = (a: string, b: string) => a.localeCompare(b)
  const [selectedTags, unselectedTags] = $derived(
    partition([...knownTags].filter(matchesSearch), (t) => tags.includes(t)).map((group) =>
      group.sort(byText)
    )
  )

  const openCreate = (tag: string) => {
    newTagName = tagDisplayName(tag)
    newTagColorIndex = tagColorIndexOf(tag)
    page = 'create'
  }

  // The tag the create page would produce, with the color encoded as padding. A
  // tag that already exists (same text *and* same padding/color) is applied rather
  // than created — hence the button reads "Set" instead of "Create".
  const candidateTag = $derived(tagWithColor(newTagName.trim(), newTagColorIndex))
  const candidateExists = $derived(knownTags.has(candidateTag))

  const submitCreate = () => {
    if (!newTagName.trim()) {
      return
    }
    createTag(candidateTag)
    search = ''
    newTagName = ''
    page = 'list'
  }

  // Reset to a clean list view each time the popup opens.
  const resetView = () => {
    page = 'list'
    search = ''
  }
</script>

<Popup>
  {#snippet trigger(toggle)}
    {@const open = () => {
      resetView()
      toggle()
    }}
    <div class="flex flex-wrap items-center gap-1">
      {#each inlineTags as tag (tag)}
        {@render chip(tag, open)}
      {/each}
      {#if overflowCount > 0}
        <button
          class="px-1 text-sm text-surface-600-400 hover:text-surface-950-50"
          onclick={open}
          aria-label="Show all tags"
        >
          +{overflowCount}
        </button>
        <Tooltip placement="top" class="max-w-[240px] text-wrap"
          >{tags.map(tagDisplayName).join(', ')}</Tooltip
        >
      {/if}
      {#if tags.length === 0}
        <button
          class="flex items-center gap-1 rounded border border-dashed border-surface-500 px-2 py-0.5 text-sm text-surface-800-200 hover:border-surface-950-50 hover:text-surface-950-50"
          onclick={open}
        >
          <span class="fd fd-plus text-[16px]"></span>
          Tag
        </button>
      {/if}
    </div>
  {/snippet}
  {#snippet content()}
    <div
      transition:slide={{ duration: 100 }}
      class="bg-white-dark absolute top-8 left-0 z-30 flex w-[304px] flex-col overflow-hidden rounded shadow-md"
    >
      <SlidingPanels
        current={page}
        width={280}
        pages={[
          { key: 'list', content: listPage },
          { key: 'create', content: createPage }
        ]}
      />
    </div>

    {#snippet listPage()}
      <div class="p-2">
        <input class="input h-9 w-full" type="search" placeholder="Search" bind:value={search} />
      </div>
      <div class="scrollbar flex max-h-[280px] flex-col overflow-y-auto pb-1">
        {#each selectedTags as tag (tag)}
          {@render tagRow(tag, true)}
        {/each}
        {#each unselectedTags as tag (tag)}
          {@render tagRow(tag, false)}
        {/each}
      </div>
      <button
        class="flex items-center gap-2 border-t border-surface-100-900 px-3 py-2 text-left text-sm hover:bg-surface-50-950"
        onclick={() => openCreate(search)}
      >
        <span class="fd fd-plus text-[16px]"></span>
        Create a new tag
      </button>
    {/snippet}

    {#snippet createPage()}
      {@const color = tagColorPalette[newTagColorIndex]}
      <div class="flex items-center gap-2 px-2 py-2">
        <button
          class="btn-icon h-7 w-7"
          onclick={() => (page = 'list')}
          aria-label="Back"
          title="Back"
        >
          <span class="fd fd-chevron-left text-[20px]"></span>
        </button>
        <span class="text-sm font-medium">Create a new tag</span>
      </div>
      <div class="flex flex-col gap-3 px-3 pb-3">
        <label class="flex flex-col gap-1 text-sm font-medium">
          Tag name
          <input
            class="input h-9 w-full"
            type="text"
            bind:value={newTagName}
            placeholder="Tag name"
          />
        </label>
        <div class="flex flex-col gap-1 text-sm font-medium">
          <span class="flex items-center gap-2">
            Label color
            <span class="font-normal text-surface-500">{color.name}</span>
          </span>
          <div class="flex flex-wrap gap-2 py-1">
            {#each tagColorPalette as paletteColor, i (paletteColor.name)}
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
                style="background-color: {paletteColor.color}"
                title={paletteColor.name}
                aria-label={paletteColor.name}
                aria-pressed={i === newTagColorIndex}
                onclick={() => (newTagColorIndex = i)}
              >
                {#if i !== newTagColorIndex}
                  <span class="bg-white-dark block h-4 w-4 rounded-full opacity-80"></span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
        <button
          class="btn h-9! w-full preset-filled-primary-500"
          disabled={!newTagName.trim()}
          onclick={submitCreate}
        >
          {candidateExists ? 'Set' : 'Create'}
        </button>
      </div>
    {/snippet}
  {/snippet}
</Popup>

{#snippet chip(tag: string, open: () => void)}
  <button
    class="flex items-center gap-1.5 rounded border border-surface-200-800 px-2 py-0.5 text-sm whitespace-nowrap hover:bg-surface-50-950"
    onclick={open}
  >
    <span class="h-2 w-2 rounded-full" style="background-color: {tagColorOf(tag).color}"></span>
    {tagDisplayName(tag)}
  </button>
{/snippet}

{#snippet tagRow(tag: string, selected: boolean)}
  <button
    class="flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-50-950"
    onclick={() => toggleTag(tag)}
  >
    <input class="pointer-events-none checkbox" type="checkbox" checked={selected} tabindex="-1" />
    <span
      class="h-2.5 w-2.5 shrink-0 rounded-full"
      style="background-color: {tagColorOf(tag).color}"
    ></span>
    <span class="truncate">{tagDisplayName(tag)}</span>
  </button>
{/snippet}
