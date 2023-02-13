import { buildSchema } from 'graphql'

export const schema = buildSchema(`
  type Book {
    identifier: String!
    prompt: String!
    markdown: String!
  }

  type BookQueries {
    get(identifier: String!): Book!
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
