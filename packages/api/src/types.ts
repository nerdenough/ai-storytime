export type Image = {
  url?: string
  caption: string
}

export type Page = {
  text: string
  image?: Image
}

export type Character = {
  name: string
  description?: string
}

export type Book = {
  identifier: string
  title: string
  prompt: string
  pages: Page[]
  characters: Character[]
}

export type BookCreateInput = {
  identifier: string
  prompt: string
  config?: BookCreateConfigInput
}

export type BookCreateConfigInput = {
  numParagraphs?: number
  maxParagraphLength?: number
}
