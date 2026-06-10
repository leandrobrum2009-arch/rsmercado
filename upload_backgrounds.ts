import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const images = [
  '1_1.jpg',
  '2_1.jpg',
  '3_1.jpg',
  '4_1.jpg',
  '5_1.jpg',
  '6_1.jpg',
  '7_1.jpg',
  '8.jpg'
]

async function uploadImages() {
  for (const imgName of images) {
    const filePath = `/mnt/user-uploads/${imgName}`
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      continue
    }

    const fileBuffer = fs.readFileSync(filePath)
    const { data, error } = await supabase.storage
      .from('flyer-backgrounds')
      .upload(imgName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      console.error(`Error uploading ${imgName}:`, error.message)
    } else {
      console.log(`Uploaded ${imgName}`)
    }
  }
}

uploadImages()
