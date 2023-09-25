import { Emoji } from '../Emoji'
import kitchenData from './kitchenData.json'
import { Data } from '../../config'
import { SearchIndex } from '../../helpers'
import {
  cook,
  EmojiItem,
  KitchenState,
  SetKitchenState,
  HandleSearchInput,
  getUnified,
  OnEmojiSelect,
} from './kitchen-tools'

let availableEmojis: EmojiItem[] = []

export function initKitchen() {
  const availables = new Set(Object.keys(kitchenData))

  availableEmojis = Data.categories.flatMap((cat) =>
    cat.emojis
      .map(SearchIndex.get)
      .filter((emoji) => emoji && availables.has(emoji.skins[0].unified)),
  )
}

export function modifySearchResultToShowKitchenPallet(
  state: KitchenState,
  emojis: EmojiItem[],
): EmojiItem[] {
  if (state.focus === 'cooked') {
    return []
  }

  let selectables = []
  if (state.focus === 'left') {
    selectables = availableEmojis
  } else {
    const pinnedCode = getUnified(state.left)
    const selectableCodes = new Set(
      kitchenData[pinnedCode].map(([leftEmoji, rightEmoji]) =>
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
    left: null,
    right: null,
    cooked: null,
    focus: 'left',
    handleSearchInput,
  }
}

export function handleRecipeClick({
  emoji,
  state,
  setState,
}: {
  emoji: EmojiItem
  state: KitchenState
  setState: SetKitchenState
}) {
  if (state.focus === 'left') {
    setState(
      {
        kitchen: {
          ...state,
          left: emoji,
          right: null,
          cooked: null,
          focus: 'right',
        },
      },
      () => {
        state.handleSearchInput()
      },
    )
  } else if (state.focus === 'right') {
    const cookedEmojiData = cook(state.left, emoji)
    if (!cookedEmojiData) {
      return
    }

    setState(
      {
        kitchen: {
          ...state,
          right: emoji,
          cooked: cookedEmojiData,
          focus: 'cooked',
        },
      },
      () => {
        state.handleSearchInput()
      },
    )
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
          left: null,
          right: null,
          cooked: null,
          focus: 'left',
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
  emoji: EmojiItem,
  onEmojiSelect?: OnEmojiSelect,
) {
  const leftEmoji = (state.focus === 'left' && emoji) || state.left || null
  const rightEmoji = (state.focus === 'right' && emoji) || state.right || null
  const cookedEmojiData =
    leftEmoji && rightEmoji
      ? cook(leftEmoji, rightEmoji)
      : state.cooked
      ? state.cooked
      : null

  const recipe =
    state.focus === 'left' && leftEmoji
      ? leftEmoji.skins[0]?.shortcodes
      : state.focus === 'right' && rightEmoji
      ? rightEmoji.skins[0]?.shortcodes
      : state.focus === 'cooked' && cookedEmojiData
      ? `${cookedEmojiData.recipe?.[0].shortcodes} x ${cookedEmojiData.recipe?.[1].shortcodes}`
      : 'Pick an emoji…'

  return (
    <div class="kitchen kitchen-preview">
      <div class="preview">
        <div class="slots">
          <button
            class={`slot ${state.focus === 'left' ? 'slot-current' : ''}`}
            onClick={() => {
              setState({ kitchen: { ...state, focus: 'left' } }, () => {
                state.handleSearchInput()
              })
            }}
          >
            {leftEmoji && (
              <Emoji emoji={leftEmoji} set={props.set} size="28px" />
            )}
          </button>

          <div>x</div>

          <button
            class={`slot ${state.focus === 'right' ? 'slot-current' : ''}`}
            disabled={!state.left}
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

          <button
            class={`slot ${state.focus === 'cooked' ? 'slot-current' : ''}`}
            disabled={!state.left || !state.right}
          >
            {cookedEmojiData && (
              <img class="cooked-emoji" src={cookedEmojiData.src} alt="" />
            )}
          </button>
        </div>
        <div class="action">
          <button
            disabled={!state.cooked}
            onClick={(ev) => onEmojiSelect(state.cooked, ev)}
          >
            Select
          </button>
        </div>
      </div>

      <div class="recipe">{recipe}</div>
    </div>
  )
}
