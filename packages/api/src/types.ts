export type Book = {
  identifier: string
  prompt: string
  markdown: string
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
