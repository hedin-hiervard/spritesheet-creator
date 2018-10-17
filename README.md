# Spritesheet Creator

**Please note this is an alpha software. Use in production at your own risk!**

The purpose of this package is to give robust, solid and production-ready way to create spritesheets from a bunch of bitmap images. It is written in pure Javascript and has **no native dependencies**.

It can be used as a standalone command-line tool (which is useful for development and CI environments) and as a Node.js module (in case your building toolchain includes some JS code).

This package is intended as a replacement for some commercial packages and is meant to be easy to use, pluggable and open-source.

# What It Does, In Short?

It takes a bunch of image files, packs them into a single texture (called a spritesheet) and provides the metadata for the game engine of choice.

# Support Input and Output formats

Basically `spritesheet-creator` supports every image format supported by `jimp` library. For the metadata currently the following output formats are supported:
- Godot 3 

Work in progress:
- cocos2d-x
- Unity

# Usage

To install as a CLI tool:
`yarn global add spritesheet-creator`

Then you can generate some spritesheets for Godot! Just do:
`spritesheet-creator generate_spritesheet godot3 <target_texture> <target_meta_folder> <paths to source files>...`

In a few seconds you will (hopefully) get a large texture and a bunch of `.tres` files. You can use them right out of the box as a replacement for the stand-alone sprites. 

This will dramatically increase the performance of the large scenes due to the batch draw call optimisation and zero texture switching.
