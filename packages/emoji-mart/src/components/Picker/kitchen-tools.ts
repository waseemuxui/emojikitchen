import { getEmojiData } from '../../utils'
import kitchenData from './kitchenData.json'
import { SearchIndex } from '../../helpers'

export function findCookedEmoji(emojiId: string): EmojiItem | undefined {
  let del = 0

  while (true) {
    del = emojiId.indexOf('+', del)
    if (del < 0) {
      break
    }

    const leftId = emojiId.substring(0, del)
    const rightId = emojiId.substring(del + 1)

    const cooked = cook(SearchIndex.get(leftId), SearchIndex.get(rightId))

    if (cooked) {
      return {
        id: cooked.id,
        name: cooked.name,
        keywords: cooked.keywords,
        skins: [
          {
            src: cooked.src,
          },
        ],
        recipe: cooked.recipe,
        version: 0,
      }
    }
  }
}

export function cook(x: EmojiItem, y: EmojiItem): EmojiData | undefined {
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
    shortcodes: undefined,
    src,
    keywords: [],
    recipe: [recipe.left, recipe.right],
  }
}

export function getUnified(emoji: EmojiItem): string {
  return emoji?.skins[0]?.unified
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
      ([leftEmoji, rightEmoji]) =>
        (leftEmoji === x.unified && rightEmoji === y.unified) ||
        (leftEmoji === y.unified && rightEmoji === x.unified),
    )
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .pop()
  if (!recipe) {
    return undefined
  }

  const [leftEmoji, rightEmoji, date] = recipe

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

export interface EmojiItem {
  id: string
  name: string
  keywords: string[]
  search?: string
  shortcodes?: string
  aliases?: string[]
  emoticons?: string[]
  skins: Skin[]
  version: number
  recipe?: [EmojiData, EmojiData]
}

interface Skin {
  native?: string
  shortcodes?: string
  unified?: string
  src?: string
}

interface EmojiData {
  id: string
  name: string
  native?: string
  unified?: string
  keywords: string[]
  shortcodes?: string
  skin?: number
  src?: string
  aliases?: string[]
  emoticons?: string[]
  recipe?: [EmojiData, EmojiData]
}

export interface KitchenState {
  enabled: boolean
  left: EmojiItem | null
  right: EmojiItem | null
  cooked: EmojiData | null
  focus: 'left' | 'right' | 'cooked'
  handleSearchInput: () => void
}

export interface SetKitchenState {
  (
    state: { kitchen: KitchenState; [key: string]: any },
    afterRender?: () => void,
  ): void
}

export interface HandleSearchInput {
  (): void
}

export interface OnEmojiSelect {
  (emojiData: EmojiData, e: Event): void
}
