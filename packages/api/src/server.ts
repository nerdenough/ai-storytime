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
import { Book, BookCreateInput, Image, Page } from './types'
import { GraphQLError } from 'graphql'
import { generateImage } from './generateImage'

const { OPENAI_API_KEY, STABLE_DIFFUSION_WEBUI_URL, DATA_PATH } = process.env

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY must be provided')
  process.exit(1)
}
if (!STABLE_DIFFUSION_WEBUI_URL) {
  console.warn(
    'No STABLE_DIFFUSION_WEBUI_URL provided, will use OpenAI for image generation.'
  )
}

const config = new Configuration({
  apiKey: OPENAI_API_KEY,
})

const openai = new OpenAIApi(config)

const createImage = async ({
  image,
  imagePath,
  filename,
  book,
  seed,
  prompt,
  width,
  height,
}: {
  image: Image
  imagePath: string
  filename: string
  book: Book
  seed: number
  prompt?: string
  width?: number
  height?: number
}): Promise<Image | undefined> => {
  if (!image?.caption || !image?.prompt) {
    console.warn('No image caption or prompt')
    return
  }

  const fullPrompt: string =
    prompt ||
    [
      'a high quality drawing, illustration, high detail, photorealistic, film grain, bloom, lens flare, bokeh, best quality, 4k, (masterpiece)',
      `(${image.prompt.concat(
        ...book.characters
          ?.filter(({ name }) =>
            image.prompt.split(', ').find((str) => name === str)
          )
          .map(({ prompt }) => prompt)
      )})`,
      `[${book.setting.prompt}]`,
    ].join(', ')

  const imageData = await generateImage({ prompt: fullPrompt, seed })

  try {
    writeFileSync(path.resolve(imagePath, `${filename}.txt`), image.caption)
    writeFileSync(
      path.resolve(imagePath, `${filename}.png`),
      imageData,
      'base64'
    )
  } catch (err) {
    console.log('failed to write image')
    return
  }

  image.url = `${DATA_PATH || '/data'}/`
  return image
}

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
        const prompt = `
Create a JSON Object "book".

A "caption" is a string describing an image (character and/or setting) based on some text.
A "prompt" is a comma-separated string of keywords that describe a caption. Wrap the most important keywords in parentheses.
An example "prompt" for the "caption" "Alice picks up the mushroom and stares at it" is:
"((young woman)), blonde hair, wearing jeans and a (white t-shirt), holding a mushroom, sitting in a red chair in a small wooden cabin".
Every "prompt" is different. A "prompt" references max 1 subject.

An "image" is an object with a "caption" string, "prompt" string, and an array of "characters" (names of the character included in the image).

"book.title" title of the story.
"book.identifier" URL friendly slug of title.
"book.coverImage" object, an "image" (caption, "prompt", characters) that describes the cover illustration of the book.
"book.pages" array, each page in "pages" contains an "image" (caption, "prompt", characters) object and "text" string.
"book.characters" array, with a "name", and an "image" (caption and "prompt") that depicts a formal portrait of the character.
"book.setting" object with a "prompt" that describes the time period, season, location, environment.

Write a short story with the following parameters:
- The story is about "${input.prompt}"
- ${input.config?.numParagraphs || 1} paragraphs
- Max ${input.config?.maxParagraphLength || 40} words per paragraph
- Each paragraph is the "text" string of a page
- Each character must have a name, and be listed in the "characters" array
- Max 3 characters in the story
- Max 2 characters per paragraph

Return the book as minified JSON.
        `

        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt,
          temperature: 0.9,
          max_tokens: input.config?.maxParagraphLength
            ? 250 * input.config.maxParagraphLength
            : 1500,
        })

        if (!response.data.choices[0]?.text) {
          throw new GraphQLError('openai did not generate any text')
        }

        const { text } = response.data.choices[0]

        let data: Book
        try {
          data = JSON.parse(text) as Book
        } catch (err) {
          console.error(err)
          console.log(text)
          throw new GraphQLError('openai did not generate text correctly')
        }

        const book: Book = {
          ...data,
          prompt,
        }

        if (!book.identifier) {
          console.log(text)
          throw new GraphQLError(
            'could not generate an identifier from the openai response'
          )
        }

        console.log('story generated with identifier', book.identifier)

        let bookPath = path.resolve('/data', book.identifier)

        let retryCounter = 0
        while (existsSync(bookPath)) {
          bookPath = `${bookPath}-${retryCounter + 1}`
          retryCounter++

          if (retryCounter === 10) {
            throw new GraphQLError('identifier already taken', {
              extensions: {
                identifier: book.identifier,
              },
            })
          }
        }

        mkdirSync(bookPath)
        writeFileSync(
          path.resolve(bookPath, 'book.json'),
          JSON.stringify(book, null, 2)
        )

        console.log('saved book.json')

        const imagePath = path.resolve(bookPath, 'images')
        const charactersPath = path.resolve(bookPath, 'characters')
        mkdirSync(imagePath)
        mkdirSync(charactersPath)

        const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

        console.log('generating page images')

        for (let i = 0; i < data.pages.length; i++) {
          const page = data.pages[i]
          if (!page.image) {
            break
          }

          const newImage = await createImage({
            image: page.image,
            imagePath,
            filename: `${i}`,
            book,
            seed,
            width: 640,
            height: 480,
          })

          data.pages[i].image = newImage || page.image
        }

        console.log('generating character images')

        for (let i = 0; i < data.characters.length; i++) {
          const character = data.characters[i]
          if (!character.image) {
            break
          }

          const prompt = `a (close up) portrait, ((headshot)), looking into the camera, artwork, ${character.image.prompt}, ${book.setting.prompt}, very detailed, realistic, high quality, 4k, masterpiece`
          console.log(prompt)

          const newImage = await createImage({
            image: character.image,
            imagePath: charactersPath,
            filename: `${i}`,
            book,
            seed,
            prompt,
            width: 512,
            height: 512,
          })

          data.characters[i].image = newImage || character.image
        }

        console.log('Done')

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
app.use('/data', express.static(DATA_PATH || '/data'))
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
