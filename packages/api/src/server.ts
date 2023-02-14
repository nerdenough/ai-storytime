import 'dotenv/config'

import express from 'express'
import { graphqlHTTP } from 'express-graphql'
import cors from 'cors'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import path from 'path'
import { Configuration, OpenAIApi } from 'openai'

import { schema } from './schema'
import { Book, BookCreateInput, Page } from './types'
import { GraphQLError } from 'graphql'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(config)

const root = {
  book: {
    get: ({ identifier }: { identifier: string }): Book | null => {
      const bookPath = path.resolve('/data', identifier)

      try {
        const files = readdirSync(bookPath, {
          withFileTypes: true,
        })

        let book: Book | null = null

        files.forEach(({ name }) => {
          if (name === 'book.json') {
            const data = readFileSync(path.resolve(bookPath, name))
            book = JSON.parse(data.toString())
          }
        })

        return book
      } catch (err) {
        return null
      }
    },
    create: async ({ input }: { input: BookCreateInput }): Promise<Book> => {
      try {
        const bookPath = path.resolve('/data', input.identifier)
        if (existsSync(bookPath)) {
          throw new GraphQLError('identifier already taken', {
            extensions: {
              identifier: input.identifier,
            },
          })
        }

        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: `
            Write a short kids picture book story.
            The story should be ${input.prompt}.
            ${input.config?.numParagraphs || 6} paragraphs long.
            Return the data in minified JSON, with the "title" as a string, an array of "pages", and an array of "characters".
            Each page in "pages" contains a paragraph as "text", about ${
              input.config?.maxParagraphLength || 40
            } words.
            Each page in "pages" contains an "image" which contains a "caption".
            The "caption" describes the illustration (both subject and setting) for the current page.
            Each character in characters contains the "name" of the character, and a "description" of their appearance.
          `,
          temperature: 0.9,
          max_tokens: input.config?.maxParagraphLength
            ? 150 * input.config.maxParagraphLength
            : 750,
        })

        if (!response.data.choices[0]?.text) {
          throw new GraphQLError('openai did not generate any text')
        }

        const { text } = response.data.choices[0]

        const data = JSON.parse(text) as Book

        const book: Book = {
          ...data,
          identifier: input.identifier,
          prompt: input.prompt,
        }

        mkdirSync(bookPath)
        writeFileSync(
          path.resolve(bookPath, 'book.json'),
          JSON.stringify(book, null, 2)
        )

        return book
      } catch (err) {
        console.error(err)
        throw err
      }
    },
  },
}

const app = express()
app.use(cors())
app.use('/data', express.static('/data'))
app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
)
app.listen(4000)
console.log('Running a GraphQL API server at http://localhost:4000/graphql')
