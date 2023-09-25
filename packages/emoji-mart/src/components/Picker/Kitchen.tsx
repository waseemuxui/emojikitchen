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
  let selectables = []
  if (state.focus === 'left') {
    selectables = availableEmojis
  } else {
    const pinnedCode = state.pinned.skins[0].unified
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
  emoji: EmojiItem
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
          pinned: null,
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
        <div class="action">
          <button>Select</button>
        </div>
      </div>

      <div class="recipe">{recipe}</div>
    </div>
  )
}
