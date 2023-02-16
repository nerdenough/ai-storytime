export type Image = {
  caption: string
  prompt: string
  characters?: string[]
  url?: string
}

export type Page = {
  text: string
  image?: Image
}

export type Character = {
  name: string
  description: string
  prompt: string
  image?: Image
}

export type Setting = {
  description: string
  prompt: string
}

export type Book = {
  identifier: string
  title: string
  prompt: string
  pages: Page[]
  characters: Character[]
  setting: Setting
}

export type BookCreateInput = {
  prompt: string
  config?: BookCreateConfigInput
}

export type BookCreateConfigInput = {
  numParagraphs?: number
  maxParagraphLength?: number
}
