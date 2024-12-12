import numpy as np
import cv2
import colorsys

import sys
args = sys.argv

def extract_ring_2(path):
    # normalize image
    og_img = cv2.imread(path)
    B, G, R = cv2.split(og_img)
    B_norm = cv2.normalize(B, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    G_norm = cv2.normalize(G, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    R_norm = cv2.normalize(R, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    normalized_image = cv2.merge([B_norm, G_norm, R_norm])
    img = np.uint8(normalized_image)

    # saturate it to pump up R and B channels while decreasing G channel for magenta
    hsv_image = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv_image)
    s = s.astype(np.float32)
    s = s * 1.5
    v = v * 1.5
    s = np.clip(s, 0, 255).astype(np.uint8)
    v = np.clip(v, 0, 255).astype(np.uint8)
    hsv_modified = cv2.merge([h, s, v])
    img = cv2.cvtColor(hsv_modified, cv2.COLOR_HSV2BGR)

    # downscale image so less noise
    dimensions = (360, 640)
    scale_factor_x = og_img.shape[1] / dimensions[0]
    scale_factor_y = og_img.shape[0] / dimensions[1]
    img = cv2.resize(img, (dimensions), interpolation=cv2.INTER_AREA)

    # mask out non-magenta colors with looser thresholds
    # then re-normalize so that G channel is even more separate from R and B
    lower2 = np.array([50, 0, 100])     # darken
    upper2 = np.array([255, 200, 255])
    mask2 = cv2.inRange(img, lower2, upper2)
    kernel = cv2.getStructuringElement(cv2.MORPH_CROSS, (8, 8))
    mask2 = cv2.morphologyEx(mask2, cv2.MORPH_CLOSE, kernel, iterations=2)
    img = cv2.bitwise_and(img, img, mask=mask2)
    mask2_3channel = cv2.cvtColor(mask2, cv2.COLOR_GRAY2BGR)
    img = np.where(mask2_3channel == 0, [255, 255, 255], img)

    B, G, R = cv2.split(img)
    B_norm = cv2.normalize(B, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    G_norm = cv2.normalize(G, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    R_norm = cv2.normalize(R, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    normalized_image = cv2.merge([B_norm, G_norm, R_norm])
    img = np.uint8(normalized_image)

    # mask out non-magenta colors again with tighter threshold
    lower = np.array([100, 0, 200])
    upper = np.array([255, 200, 255])
    mask = cv2.inRange(img, lower, upper)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    # white_mask = cv2.inRange(img, (180, 180, 180), (255, 255, 255)) # dunno if this helps tbh
    # mask = cv2.subtract(mask, white_mask)
    segmented = cv2.bitwise_and(img, img, mask=mask)
    # mask_3channel = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    # segmented = np.where(mask_3channel == 0, [255, 255, 255], segmented).astype(np.uint8)
    # print(segmented.shape)

    # find largest magenta contour 
    gray = cv2.cvtColor(segmented, cv2.COLOR_BGR2GRAY)
    contours, hierarchy = cv2.findContours(gray, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    inner_contour_indxs = [i for i in range(len(hierarchy[0])) if hierarchy[0][i][3] != -1]
    inner_contours = [contours[i] for i in inner_contour_indxs]
    if len(inner_contours) == 0:
        exit(1)

    largest_contour = max(inner_contours, key=cv2.contourArea)
    cv2.drawContours(segmented, [largest_contour], -1, (0, 255, 0), 2)
    upscaled_contour = largest_contour.copy().astype(np.float32) # upscale contour to final image
    upscaled_contour[:, :, 0] *= scale_factor_x
    upscaled_contour[:, :, 1] *= scale_factor_y
    upscaled_contour = upscaled_contour.astype(np.int32)

    # and mask the image with that contour
    mask_2 = np.zeros_like(og_img)
    cv2.drawContours(mask_2, [upscaled_contour], -1, (255, 255, 255), thickness=cv2.FILLED)
    white_background = np.full_like(og_img, 255)
    masked_image = np.where(mask_2 == 255, og_img, white_background)

    # if failed to detect big hole... fail it
    non_white_mask = np.any(masked_image != [255, 255, 255], axis=-1)
    total_pixels = masked_image.shape[0] * masked_image.shape[1]
    non_white_pixels = np.sum(non_white_mask)
    ratio = non_white_pixels / total_pixels
    if ratio < 0.03:
        exit(1)

    cv2.imwrite(f'{path}.temp.png', masked_image)
    
    binary_mask = np.any(masked_image != [255, 255, 255], axis=-1).astype(np.uint8)
    binary_mask = binary_mask * 255
    cv2.imwrite(f'{path}.mask_temp.png', binary_mask)

extract_ring_2(args[1])
exit(0)
