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
import { Book, BookCreateInput } from './types'
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

        let prompt = ''
        let markdown = ''
        files.forEach(({ name }) => {
          if (name === 'prompt.txt') {
            const data = readFileSync(path.resolve(bookPath, name))
            prompt = data.toString('utf-8')
          } else if (name === 'book.md') {
            const data = readFileSync(path.resolve(bookPath, name))
            markdown = data.toString('utf-8')
          }
        })

        return {
          identifier,
          prompt,
          markdown,
        }
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

        mkdirSync(bookPath)
        mkdirSync(path.resolve(bookPath, 'images'))

        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: `
            ${input.prompt}.
            Write the story in Markdown.
            Include a short caption describing a picture between each paragraph.
            Use underscores to italicize the captions on new lines.
            Include a title.
            ${input.config?.numParagraphs || 5} paragraphs long.
            ${input.config?.maxParagraphLength || 20} words max per paragraph.
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
        const lines = text.split('\n')
        let imageCount = 0

        const bookData = lines
          .map((line) => {
            if (line.length > 2 && line.startsWith('_') && line.endsWith('_')) {
              const caption = line.slice(1, -1)
              writeFileSync(
                path.resolve(bookPath, 'images', `${imageCount}.txt`),
                caption
              )
              const str = `![${caption}][${imageCount}]`
              imageCount++
              return str
            }
            return line
          })
          .join('\n')

        writeFileSync(path.resolve(bookPath, 'prompt.txt'), input.prompt)
        writeFileSync(path.resolve(bookPath, 'book.md'), bookData)

        return {
          identifier: input.identifier,
          prompt: input.prompt,
          markdown: bookData,
        }
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
