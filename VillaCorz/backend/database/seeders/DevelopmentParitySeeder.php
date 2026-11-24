<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use Illuminate\Database\Seeder;

class DevelopmentParitySeeder extends Seeder
{
    private const SERVICE_FIELDS = [
        'Room 1' => [
            'description' => 'Provides a cozy bunk-style setup with air conditioning, a TV, and a private CR, great for small groups and families.',
            'price' => 3000,
            'weekend_price' => 3000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 4,
            'features' => [],
            'amenities' => ['TV', 'Private CR', 'Airconditioned'],
            'status' => 'active',
            'kind' => 'room',
        ],
        'Room 2' => [
            'description' => 'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.',
            'price' => 3000,
            'weekend_price' => 3000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 4,
            'features' => [],
            'amenities' => ['TV', 'Private CR', 'Airconditioned'],
            'status' => 'active',
            'kind' => 'room',
        ],
        'Room 3' => [
            'description' => 'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.',
            'price' => 3000,
            'weekend_price' => 3000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 4,
            'features' => [],
            'amenities' => ['TV', 'Private CR', 'Airconditioned'],
            'status' => 'active',
            'kind' => 'room',
        ],
        'Room 4' => [
            'description' => 'Offers warm wooden bunk beds and air-conditioned comfort, an ideal pick for guest who wants a simple, peaceful retreat without the extras.',
            'price' => 4000,
            'weekend_price' => 4000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 10,
            'features' => [],
            'amenities' => ['Airconditioned'],
            'status' => 'active',
            'kind' => 'room',
        ],
        'Room 5' => [
            'description' => 'Features  spacious ,comfty bed with airconditioning and two fans, giving you budget-friendly comfort and a relaxing, easygoing stay.',
            'price' => 4000,
            'weekend_price' => 4000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 10,
            'features' => [],
            'amenities' => ['Airconditioned', '2 Fans'],
            'status' => 'active',
            'kind' => 'room',
        ],
        'The Whole Villa' => [
            'description' => 'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
            'price' => 15500,
            'weekend_price' => 17000,
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 1500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
            'pax' => 35,
            'features' => [],
            'amenities' => ['TV', 'Private CR', 'Airconditioned', '2 Fans'],
            'status' => 'active',
            'kind' => 'exclusive',
        ],
    ];

    private const SERVICE_IMAGES = [
        [
            'service' => 'Room 1',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332098/villacorz/services/yprlscorcqiiql1r424p.png',
            'public_id' => 'villacorz/services/yprlscorcqiiql1r424p',
            'is_primary' => true,
            'sort_order' => 0,
        ],
        [
            'service' => 'Room 1',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332130/villacorz/services/tuprxy0ps8seo9hl1mne.png',
            'public_id' => 'villacorz/services/tuprxy0ps8seo9hl1mne',
            'is_primary' => false,
            'sort_order' => 1,
        ],
        [
            'service' => 'Room 1',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332110/villacorz/services/tjpf9dsiylah0qp23loi.png',
            'public_id' => 'villacorz/services/tjpf9dsiylah0qp23loi',
            'is_primary' => false,
            'sort_order' => 2,
        ],
        [
            'service' => 'Room 1',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332120/villacorz/services/qb6uqdun4bvxcyglv6dz.png',
            'public_id' => 'villacorz/services/qb6uqdun4bvxcyglv6dz',
            'is_primary' => false,
            'sort_order' => 3,
        ],
        [
            'service' => 'The Whole Villa',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794497904/villacorz/services/ngkerfgqaxjlzi5gyi1b.png',
            'public_id' => 'villacorz/services/ngkerfgqaxjlzi5gyi1b',
            'is_primary' => true,
            'sort_order' => 0,
        ],
        [
            'service' => 'Room 2',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794497992/villacorz/services/d9prvrjz19lfwcxkkod3.png',
            'public_id' => 'villacorz/services/d9prvrjz19lfwcxkkod3',
            'is_primary' => true,
            'sort_order' => 0,
        ],
        [
            'service' => 'Room 3',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498252/villacorz/services/eyomr4waqrbvssuz0wn9.png',
            'public_id' => 'villacorz/services/eyomr4waqrbvssuz0wn9',
            'is_primary' => true,
            'sort_order' => 0,
        ],
        [
            'service' => 'Room 4',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498384/villacorz/services/dnjtsgrqbppowcnhkblj.png',
            'public_id' => 'villacorz/services/dnjtsgrqbppowcnhkblj',
            'is_primary' => true,
            'sort_order' => 0,
        ],
        [
            'service' => 'Room 5',
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498540/villacorz/services/sga1hrdyuw1ujmq6drzw.png',
            'public_id' => 'villacorz/services/sga1hrdyuw1ujmq6drzw',
            'is_primary' => true,
            'sort_order' => 0,
        ],
    ];

    private const REVIEW_IMAGES = [
        [
            'service' => 'Room 1',
            'slot' => 0,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023530/villacorz/reviews/659732771_122108379015254151_5274887618052306107_n.jpg',
            'public_id' => 'villacorz/reviews/659732771_122108379015254151_5274887618052306107_n',
        ],
        [
            'service' => 'Room 1',
            'slot' => 1,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023533/villacorz/reviews/662903458_122109837411254151_4531506217971394489_n.jpg',
            'public_id' => 'villacorz/reviews/662903458_122109837411254151_4531506217971394489_n',
        ],
        [
            'service' => 'Room 2',
            'slot' => 0,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023539/villacorz/reviews/663241837_122109837453254151_2180476612582028984_n.jpg',
            'public_id' => 'villacorz/reviews/663241837_122109837453254151_2180476612582028984_n',
        ],
        [
            'service' => 'Room 2',
            'slot' => 1,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023541/villacorz/reviews/671995785_122112155535254151_699021452515599668_n.jpg',
            'public_id' => 'villacorz/reviews/671995785_122112155535254151_699021452515599668_n',
        ],
        [
            'service' => 'Room 3',
            'slot' => 0,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023543/villacorz/reviews/672681873_122112156057254151_983553401706163131_n.jpg',
            'public_id' => 'villacorz/reviews/672681873_122112156057254151_983553401706163131_n',
        ],
        [
            'service' => 'Room 3',
            'slot' => 1,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023545/villacorz/reviews/673491285_122112155643254151_4901341852310194313_n.jpg',
            'public_id' => 'villacorz/reviews/673491285_122112155643254151_4901341852310194313_n',
        ],
        [
            'service' => 'Room 4',
            'slot' => 0,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023547/villacorz/reviews/675705532_122112501993254151_5137603749647673458_n.jpg',
            'public_id' => 'villacorz/reviews/675705532_122112501993254151_5137603749647673458_n',
        ],
        [
            'service' => 'Room 4',
            'slot' => 1,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023549/villacorz/reviews/684845717_122113564989254151_1955419800119921005_n.jpg',
            'public_id' => 'villacorz/reviews/684845717_122113564989254151_1955419800119921005_n',
        ],
        [
            'service' => 'Room 5',
            'slot' => 0,
            'url' => 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795023551/villacorz/reviews/690643071_122113977681254151_4657546967852472157_n.jpg',
            'public_id' => 'villacorz/reviews/690643071_122113977681254151_4657546967852472157_n',
        ],
    ];

    public function run(): void
    {
        $this->syncServiceFields();
        $this->syncServiceOwners();
        $this->syncServiceImages();
        $this->syncReviewImages();
    }

    private function syncServiceFields(): void
    {
        foreach (self::SERVICE_FIELDS as $name => $fields) {
            Service::where('name', $name)->update($fields);
        }
    }

    private function syncServiceOwners(): void
    {
        $admin = User::where('email', 'dlord0260@gmail.com')->first();

        if ($admin !== null) {
            Service::where('kind', 'room')->update(['created_by' => $admin->id]);
        }

        Service::where('kind', 'exclusive')->update(['created_by' => null]);
    }

    private function syncServiceImages(): void
    {
        ServiceImage::query()->delete();

        foreach (self::SERVICE_IMAGES as $image) {
            $service = Service::where('name', $image['service'])->first();

            if ($service === null) {
                continue;
            }

            ServiceImage::create([
                'service_id' => $service->id,
                'image_url' => $image['url'],
                'public_id' => $image['public_id'],
                'is_primary' => $image['is_primary'],
                'sort_order' => $image['sort_order'],
            ]);
        }
    }

    private function syncReviewImages(): void
    {
        ServiceReviewImage::query()->delete();

        foreach (self::REVIEW_IMAGES as $image) {
            $service = Service::where('name', $image['service'])->first();

            if ($service === null) {
                continue;
            }

            $review = ServiceReview::where('service_id', $service->id)
                ->where('status', 'published')
                ->orderBy('id')
                ->limit($image['slot'] + 1)
                ->get()
                ->get($image['slot']);

            if ($review === null) {
                continue;
            }

            ServiceReviewImage::create([
                'service_review_id' => $review->id,
                'image_url' => $image['url'],
                'public_id' => $image['public_id'],
                'sort_order' => 0,
            ]);
        }
    }
}
