import sdwebui from 'node-sd-webui'

type Props = {
  prompt: string
  seed: number
  width?: number
  height?: number
}

export const generateImage = async ({
  prompt,
  seed,
  width,
  height,
}: Props): Promise<string> => {
  const result = await sdwebui({
    apiUrl: process.env.STABLE_DIFFUSION_WEBUI_URL,
  }).txt2img({
    prompt,
    negativePrompt:
      '(watermark), text, deformed, disfigured, nsfw, bad proportions, bad anatomy, blurry, low quality, worst quality',
    seed,
    samplingMethod: 'DPM++ 2M Karras',
    steps: 20,
    cfgScale: 7,
    width,
    height,
  })

  return result.images[0]
}
