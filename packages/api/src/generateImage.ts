type Props = {
  prompt: string
  seed: string
}

export const generateImage = async ({
  prompt,
  seed,
}: Props): Promise<string> => {
  const body = {
    prompt,
    seed,
    sampler_name: 'Euler a',
    steps: 20,
    cfg_scale: 7,
    width: 1024,
    height: 768,
    negative_prompt:
      '(watermark), text, deformed, disfigured, nsfw, bad proportions, bad anatomy, blurry, low quality, worst quality',
  }

  /* @ts-ignore */
  const result = await fetch(
    `${process.env.STABLE_DIFFUSION_WEBUI_URL}/sdapi/v1/txt2img`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  ).then((res: any) => res.json())

  return result.images[0]
}
