import { buildSchema } from 'graphql'

export const schema = buildSchema(`
  type Image {
    url: String
    caption: String!
  }

  type Page {
    text: String!
    image: Image
  }

  type Character {
    name: String!
    description: String
  }

  type Book {
    identifier: String!
    title: String!
    prompt: String!
    pages: [Page!]!
    characters: [Character!]!
  }

  type BookQueries {
    get(identifier: String!): Book
  }

  input BookCreateConfigInput {
    numParagraphs: Int
    maxParagraphLength: Int
  }

  input BookCreateInput {
    identifier: String!
    prompt: String!
    config: BookCreateConfigInput
  }

  type BookMutations {
    create(input: BookCreateInput!): Book!
  }

  type Query {
    book: BookQueries!
  }

  type Mutation {
    book: BookMutations!
  }
`)
