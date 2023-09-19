import { getEmojiData } from '../../utils'
import { Emoji } from '../Emoji'
import kitchenData from './kitchenData.json'
import { Data } from '../../config'
import { SearchIndex } from '../../helpers'

let availableEmojis: Emoji[] = []

export function initKitchen() {
  const availables = new Set(Object.keys(kitchenData))

  availableEmojis = Data.categories.flatMap((cat) =>
    cat.emojis
      .map(SearchIndex.get)
      .filter((emoji) => availables.has(emoji.skins[0].unified)),
  )
}

export function modifySearchResultToShowKitchenPallet(
  state: KitchenState,
  emojis: Emoji[],
): Emoji[] {
  let selectables = []
  if (state.focus === 'left') {
    selectables = availableEmojis
  } else {
    const pinnedCode = state.pinned.skins[0].unified
    const selectableCodes = new Set(
      kitchenData[pinnedCode].map(({ leftEmoji, rightEmoji }) =>
        leftEmoji === pinnedCode ? rightEmoji : leftEmoji,
      ),
    )

    selectables = availableEmojis.filter((e) =>
      selectableCodes.has(e.skins[0].unified),
    )
  }

  if (!emojis) {
    return selectables
  } else {
    const ids = new Set(emojis.map((e) => e.id))
    return selectables.filter((e) => ids.has(e.id))
  }
}

export function getInitialKitchenState(
  handleSearchInput: HandleSearchInput,
): KitchenState {
  return {
    enabled: false,
    pinned: null,
    focus: 'left',
    handleSearchInput,
  }
}

export function handleRecipeClick({
  e,
  emoji,
  state,
  setState,
  onEmojiSelect,
}: {
  e: Event
  emoji: Emoji
  state: KitchenState
  setState: SetKitchenState
  onEmojiSelect?: OnEmojiSelect
}) {
  if (state.focus === 'left') {
    setState({ kitchen: { ...state, pinned: emoji, focus: 'right' } }, () => {
      state.handleSearchInput()
    })
  } else {
    const cookedEmojiData = cook(state.pinned, emoji)
    if (!cookedEmojiData) {
      return
    }

    onEmojiSelect(cookedEmojiData, e)
  }
}

export function renderKitchenCheckbox(
  state: KitchenState,
  setState: SetKitchenState,
) {
  const onClick = () => {
    const enabled = !state.enabled

    setState(
      {
        kitchen: {
          ...state,
          enabled,
        },
      },
      () => {
        state.handleSearchInput()
      },
    )
  }

  return (
    <div class="kitchen kitchen-checkbox padding-lr">
      <div class="box" onClick={onClick}>
        <button
          class="switch"
          role="checkbox"
          aria-checked={state.enabled}
          aria-labelledby="switch-label"
        >
          <span class="switch-handle" aria-hidden="true"></span>
        </button>
        <label id="switch-label">Kitchen Mode</label>
      </div>
    </div>
  )
}

export function renderKitchenPreview(
  props: any,
  state: KitchenState,
  setState: SetKitchenState,
  emoji: Emoji,
) {
  const leftEmoji = (state.focus === 'left' && emoji) || state.pinned || null
  const rightEmoji = (state.focus === 'right' && emoji) || null
  const cookedEmojiData =
    leftEmoji && rightEmoji ? cook(leftEmoji, rightEmoji) : null

  let recipe = ''
  if (leftEmoji) {
    recipe += leftEmoji?.skins[0].shortcodes
  }
  if (rightEmoji) {
    recipe += ' x '
    recipe += rightEmoji?.skins[0].shortcodes
  }
  recipe ||= 'Pick an emoji…'

  return (
    <div class="kitchen kitchen-preview">
      <div class="slots">
        <button
          class={`slot ${state.focus === 'left' ? 'slot-current' : ''}`}
          onClick={() => {
            setState({ kitchen: { ...state, focus: 'left' } }, () => {
              state.handleSearchInput()
            })
          }}
        >
          {leftEmoji && <Emoji emoji={leftEmoji} set={props.set} size="28px" />}
        </button>

        <div>x</div>

        <button
          class={`slot ${state.focus === 'right' ? 'slot-current' : ''}`}
          disabled={!state.pinned}
          onClick={() => {
            setState({ kitchen: { ...state, focus: 'right' } }, () => {
              state.handleSearchInput()
            })
          }}
        >
          {rightEmoji && (
            <Emoji emoji={rightEmoji} set={props.set} size="28px" />
          )}
        </button>

        <div>=</div>

        <div class="slot">
          {cookedEmojiData && (
            <img class="cooked-emoji" src={cookedEmojiData.src} alt="" />
          )}
        </div>
      </div>

      <div class="recipe">{recipe}</div>
    </div>
  )
}

function cook(x: Emoji, y: Emoji): EmojiData | undefined {
  const recipe = findRecipe(
    getEmojiData(x, { skinIndex: 0 }),
    getEmojiData(y, { skinIndex: 0 }),
  )
  if (!recipe) {
    return undefined
  }

  const src = getCookedEmojiSrc(recipe)

  return {
    id: `${recipe.left.id}+${recipe.right.id}`,
    name: `${recipe.left.name} & ${recipe.right.name}`,
    shortcodes: '',
    src,
    keywords: [],
  }
}

function getCookedEmojiSrc(recipe: KitchenRecipe): string {
  const rootUrl = 'https://www.gstatic.com/android/keyboard/emojikitchen'

  const toCode = (unifiedCode: string) =>
    unifiedCode
      .split('-')
      .map((part: string) => `u${part.toLowerCase()}`)
      .join('-')
  const toFileName = (recipe: KitchenRecipe) =>
    `${toCode(recipe.left.unified)}_${toCode(recipe.right.unified)}.png`

  return `${rootUrl}/${recipe.date}/${toCode(recipe.left.unified)}/${toFileName(
    recipe,
  )}`
}

function findRecipe(x: EmojiData, y: EmojiData): KitchenRecipe | undefined {
  const row = kitchenData[x.unified]
  if (!row) {
    return undefined
  }

  const recipe = row
    .filter(
      (r) =>
        (r.leftEmoji === x.unified && r.rightEmoji === y.unified) ||
        (r.leftEmoji === y.unified && r.rightEmoji === x.unified),
    )
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .pop()
  if (!recipe) {
    return undefined
  }

  const { leftEmoji, rightEmoji, date } = recipe

  return {
    left: leftEmoji === x.unified ? x : y,
    right: rightEmoji === x.unified ? x : y,
    date,
  }
}

interface KitchenRecipe {
  left: EmojiData
  right: EmojiData
  date: string
}

interface Emoji {
  id: string
  name: string
  keywords: string[]
  shortcodes: string
  aliases?: string[]
  emoticons?: string[]
  skins: any[]
}

interface EmojiData {
  id: string
  name: string
  native?: string
  unified?: string
  keywords: string[]
  shortcodes: string
  skin?: number
  src?: string
  aliases?: string[]
  emoticons?: string[]
}

export interface KitchenState {
  enabled: boolean
  pinned: Emoji | null
  focus: 'left' | 'right'
  handleSearchInput: () => void
}

interface SetKitchenState {
  (
    state: { kitchen: KitchenState; [key: string]: any },
    afterRender?: () => void,
  ): void
}

interface HandleSearchInput {
  (): void
}

interface OnEmojiSelect {
  (emojiData: EmojiData, e: Event): void
}
