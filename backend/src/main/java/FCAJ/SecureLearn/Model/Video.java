/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;

import java.time.LocalDateTime;

/**
 *
 * @author ngoct
 */
public class Video {
    int chapterId;
    String title, description;
    int videoNumber;
    int length;
    int size;
    LocalDateTime uploadedDate;
    String storageURL;
    String fileType;
    String resolution;
    String thumbnailURL;
    int uploaderId;

    public Video(int chapterId, String title, String description, int videoNumber, int length, int size, LocalDateTime uploadedDate, String storageURL, String fileType, String resolution, String thumbnailURL, int uploaderId) {
        this.chapterId = chapterId;
        this.title = title;
        this.description = description;
        this.videoNumber = videoNumber;
        this.length = length;
        this.size = size;
        this.uploadedDate = uploadedDate;
        this.storageURL = storageURL;
        this.fileType = fileType;
        this.resolution = resolution;
        this.thumbnailURL = thumbnailURL;
        this.uploaderId = uploaderId;
    }

    public Video() {
    }

    public int getChapterId() {
        return chapterId;
    }

    public void setChapterId(int chapterId) {
        this.chapterId = chapterId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getVideoNumber() {
        return videoNumber;
    }

    public void setVideoNumber(int videoNumber) {
        this.videoNumber = videoNumber;
    }

    public int getLength() {
        return length;
    }

    public void setLength(int length) {
        this.length = length;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public LocalDateTime getUploadedDate() {
        return uploadedDate;
    }

    public void setUploadedDate(LocalDateTime uploadedDate) {
        this.uploadedDate = uploadedDate;
    }

    public String getStorageURL() {
        return storageURL;
    }

    public void setStorageURL(String storageURL) {
        this.storageURL = storageURL;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getThumbnailURL() {
        return thumbnailURL;
    }

    public void setThumbnailURL(String thumbnailURL) {
        this.thumbnailURL = thumbnailURL;
    }

    public int getUploaderId() {
        return uploaderId;
    }

    public void setUploaderId(int uploaderId) {
        this.uploaderId = uploaderId;
    }
    
    
}
