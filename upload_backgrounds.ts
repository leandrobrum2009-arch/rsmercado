import { createClient } from '@supabase/supabase-client'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const images = [
  { id: '06635091-8f3d-4ef6-a568-a0b920b449f4', name: '4(1).jpg' },
  { id: '7d0ff44b-701f-4c07-b4f2-f36bb92a373c', name: '3(1).jpg' },
  { id: '60d4e63e-ff6d-405f-9677-5963591dc570', name: '2(1).jpg' },
  { id: '061e8ea6-0712-4d5a-9202-c518f491ae65', name: '8.jpg' },
  { id: '2bda1bec-2704-4cc1-803f-4d75f033e2ce', name: '5(1).jpg' },
  { id: '93df8957-b77e-44d2-ad7f-b4092dd83464', name: '1(1).jpg' },
  { id: 'e6e576db-859a-4108-b1aa-b5cc2d71e93d', name: '6(1).jpg' },
  { id: '5dfeec0e-c0ea-4eae-b07c-0fc0fe4df3f6', name: '7(1).jpg' },
]

async function uploadImages() {
  for (const img of images) {
    const filePath = `/mnt/user-uploads/${img.name}`
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      continue
    }

    const fileBuffer = fs.readFileSync(filePath)
    const { data, error } = await supabase.storage
      .from('flyer-backgrounds')
      .upload(img.name, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      console.error(`Error uploading ${img.name}:`, error.message)
    } else {
      console.log(`Uploaded ${img.name}`)
    }
  }
}

uploadImages()
