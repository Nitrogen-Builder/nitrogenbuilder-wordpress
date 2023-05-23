import React from 'react';

import type { Provider } from '@nitrogenbuilder/core/@types/settings.js';
import Fuse from 'fuse.js';

import './index.scss';

export type WordPressProps = {
	apiUrl: string;
	postType: string;
};

const wordpress = ({ apiUrl, postType }: WordPressProps): Provider => {
	const getFileUrl = (file: any) => file.url;

	const searchOptions = {
		keys: ['title'],
	};

	let allPages: any[] = [];
	let fuse: Fuse<any> | null = null;

	async function getPages() {
		const allPagesRes = await fetch(`${API_URL}/${WP_COLLECTION}/`);
		allPages = await allPagesRes.json();
	}

	async function getFuse() {
		if (fuse) return fuse;
		if (!allPages.length) await getPages();
		fuse = new Fuse(allPages, searchOptions);
		return fuse;
	}

	const API_URL = apiUrl;
	// const API_TOKEN = import.meta.env.WP_API_TOKEN;
	const WP_COLLECTION = postType;

	return {
		savePage: async (title, page, setPageId, pageId) => {
			if (pageId !== null && pageId !== undefined && pageId.trim() !== '') {
				// get author from url params
				const urlParams = new URLSearchParams(window.location.search);
				const author = urlParams.get('authorId');

				await fetch(`${API_URL}/${WP_COLLECTION}/${pageId}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						data: { title, author, data: JSON.stringify(page) },
					}),
				});

				return;
			}

			const res = await fetch(`${API_URL}/${WP_COLLECTION}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					data: { title, data: page },
				}),
			});
			const data = await res.json();

			setPageId(`${data.data.id}`);
		},
		loadPage: async (pageId) => {
			const res = await fetch(`${API_URL}/${WP_COLLECTION}/${pageId}`);
			const data = await res.json();

			return {
				title: data.title,
				data: data.content,
			};
		},
		searchUrls: async (
			query: string
		): Promise<{ label: string; slug?: string; value: string }[]> => {
			if (query.length > 0) {
				const fuse = await getFuse();

				const fuseSearch = fuse.search(query);

				const data = fuseSearch.map((page) => ({
					label: page.item.title,
					slug: page.item.slug,
					value: page.item.permalink,
				}));

				return data;
			}

			return [];
		},
		gallery: {
			getFileUrl,
			getFiles: async (setFiles, fileTypes, search, page, setMaxPages) => {
				let filterQuery: string[] = [];

				if (fileTypes) {
					filterQuery = [
						`filters[ext][]=${fileTypes.join('&filters[ext][]=')}`,
					];
				}

				if (search.length > 0) {
					filterQuery.push(`filters[search]=${search}`);
				}

				if (page > 0) {
					filterQuery.push(`paged=${page}`);
				}

				fetch(`${API_URL}/media?${filterQuery.join('&')}`)
					.then((res) => res.json())
					.then((data) => {
						// sort by createdAt
						data.images.sort((a: any, b: any) => {
							return (
								new Date(b.post_date).getTime() -
								new Date(a.post_date).getTime()
							);
						});
						setFiles(data.images);
						setMaxPages(data.pages);
					});
			},
			updateFile: (id, data) => {
				fetch(`${API_URL}/media?id=${id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ alt: data.alt }),
				});
			},
			uploadFiles: async (files) => {
				const formData = new FormData();

				files.forEach((file) => formData.append('files[]', file, file.name));

				const res = await fetch(`${API_URL}/media`, {
					method: 'POST',
					body: formData,
				});

				const data = await res.json();

				return data;
			},
			renderFiles: (files, selectedFile, setSelectedFile) => {
				return files.map((file) => (
					<div
						key={file.id}
						className={`wordpress-gallery__container__file-container__single ${
							['.png', '.svg', '.eps'].includes(file.ext)
								? 'wordpress-gallery__container__file-container__single-file--png-svg-eps'
								: ''
						} ${selectedFile?.id === file.id ? 'ring' : ''}`}
					>
						{file.mime.includes('image') ? (
							<img
								draggable={false}
								className={`wordpress-gallery__container__file-container__single__img ${
									['.png', '.svg', '.eps'].includes(file.ext)
										? 'wordpress-gallery__container__file-container__single__img--object-contain'
										: 'wordpress-gallery__container__file-container__single__img--object-cover'
								}`}
								key={file.id}
								alt={file.alt}
								src={file.formats.thumbnail.url}
								onClick={() => setSelectedFile(file)}
							/>
						) : (
							<div
								className='wordpress-gallery__container__file-container__single__container'
								title={file.name}
								onClick={() => setSelectedFile(file)}
							>
								<div className='wordpress-gallery__container__file-container__single__container__file'>
									<div className='wordpress-gallery__container__file-container__single__container__file__name'>
										{file.name.split('.')[0].length > 10 ? (
											<span title={file.name}>
												{file.name.split('.')[0].slice(0, 10)}...
											</span>
										) : (
											file.name.split('.')[0]
										)}
									</div>
									<div className='wordpress-gallery__container__file-container__single__container__file__ext'>
										{file.ext}
									</div>
									<div className='wordpress-gallery__container__file-container__single__container__file__size'>
										{file.size < 1000
											? Math.round(file.size) + ' KB'
											: Math.round(file.size / 100) / 10 + ' MB'}
									</div>
								</div>
							</div>
						)}
					</div>
				));
			},
			renderSelectedFile: (selectedFile, updateFileData, details) => {
				const creationDate = new Date(selectedFile.post_date);
				const creationDateFormatted = `${creationDate.getDate()}/${creationDate.getMonth()}/${creationDate.getFullYear()}`;

				const fileName = selectedFile.name;
				const fileExt = selectedFile.ext;
				const fileAlt = selectedFile.alt;
				const fileMime = selectedFile.mime;

				return (
					<div className='wordpress-selected-file-panel'>
						<div
							className={`wordpress-selected-file-panel__img-container ${
								['.png', '.svg', '.eps'].includes(fileExt)
									? 'wordpress-selected-file-panel__img-container--png-svg-eps'
									: ''
							}`}
						>
							{fileMime.includes('image') ? (
								<img
									draggable={false}
									className={`wordpress-selected-file-panel__img-container__img ${
										['.png', '.svg', '.eps'].includes(fileExt)
											? 'wordpress-selected-file-panel__img-container__img--object-contain'
											: 'wordpress-selected-file-panel__img-container__img--object-cover'
									}`}
									alt={fileAlt}
									src={selectedFile.formats.thumbnail.url}
								/>
							) : (
								<div
									className='wordpress-selected-file-panel__img-container__container'
									title={fileName}
								>
									<div className='wordpress-selected-file-panel__img-container__container__file'>
										<div className='wordpress-selected-file-panel__img-container__container__file__name'>
											{fileName.length > 10 ? (
												<span title={fileName}>{fileName.slice(0, 10)}...</span>
											) : (
												fileName
											)}
										</div>
										<div className='wordpress-selected-file-panel__img-container__container__file__ext'>
											{fileExt}
										</div>
										<div className='wordpress-selected-file-panel__img-container__container__file__size'>
											{selectedFile.size < 1000
												? Math.round(selectedFile.size) + ' KB'
												: Math.round(selectedFile.size / 100) / 10 + ' MB'}
										</div>
									</div>
								</div>
							)}
						</div>
						{details && (
							<div className='wordpress-selected-file-panel__details'>
								<div className=''>ID: {selectedFile.id}</div>
								<div className='wordpress-selected-file-panel__details__filename'>
									{fileName}
								</div>
								<div className=''>{creationDateFormatted}</div>
								<div className=''>{Math.round(selectedFile.size)} KB</div>
								<div className=''>
									{selectedFile.width} by {selectedFile.height} pixels
								</div>
								<div className=''>Alt Text:</div>
								<textarea
									className='wordpress-selected-file-panel__details__alt-text'
									value={selectedFile.alt ?? ''}
									rows={3}
									onChange={(e) => {
										updateFileData({
											...selectedFile,
											alt: e.target.value,
										});
									}}
								></textarea>
							</div>
						)}
					</div>
				);
			},
		},
	};
};

export default wordpress;
